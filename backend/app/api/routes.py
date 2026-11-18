import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.email import EmailSendError, FakeEmailService
from app.core.security import (
    code_hash,
    create_token,
    generate_code,
    hash_password,
    require_role,
    verify_password,
)
from app.db.models import (
    AuditoriaAcao,
    DesafioAutenticacao,
    Reserva,
    Sala,
    Usuario,
    VerificacaoEmail,
)
from app.db.session import get_db
from app.schemas import (
    LoginRequest,
    Motivo,
    PasswordChange,
    PasswordRecovery,
    PasswordReset,
    ReservaCreate,
    SalaCreate,
    SalaUpdate,
    UsuarioAdminCreate,
    UsuarioCreate,
    UsuarioUpdate,
    Verify2FA,
    VerifyEmail,
)

router = APIRouter()
fake_email = FakeEmailService()


def send_email(recipient: str, subject: str, body: str) -> None:
    if settings.testing:
        fake_email.send(recipient, subject, body)
        return
    from app.core.email import EmailService
    EmailService().send(recipient, subject, body)


def audit(db: Session, actor_id: int | None, acao: str, entidade: str, entidade_id: int | str, detalhes: str | None = None):
    db.add(AuditoriaAcao(usuario_id=actor_id, acao=acao, entidade=entidade, entidade_id=str(entidade_id), detalhes=detalhes))


def verify_domain(email: str) -> bool:
    domain = email.rsplit("@", 1)[-1].lower()
    return domain in settings.allowed_domains


@router.post("/usuarios/cadastro", status_code=201)
@router.post("/usuarios", status_code=201)
def cadastrar_professor(dados: UsuarioCreate, db: Session = Depends(get_db)):
    email = str(dados.email).lower()
    if not verify_domain(email):
        raise HTTPException(status_code=400, detail="Domínio de e-mail não autorizado.")
    if db.scalar(select(Usuario).where(func.lower(Usuario.email) == email)):
        raise HTTPException(status_code=409, detail="Já existe uma conta com este e-mail.")

    user = Usuario(
        nome=dados.nome,
        email=email,
        telefone=dados.telefone,
        senha_hash=hash_password(dados.senha),
        tipo="professor",
        email_verificado=False,
        ativo=True,
    )
    db.add(user)
    db.flush()
    code = generate_code()
    verification = VerificacaoEmail(
        usuario_id=user.id,
        codigo_hash=code_hash(code),
        expira_em=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db.add(verification)
    db.commit()
    try:
        send_email(email, "Devs Soluntions - Confirme seu e-mail", f"Seu código de confirmação é: {code}")
    except EmailSendError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    audit(db, user.id, "CADASTRO", "usuario", user.id, "Cadastro público de professor")
    db.commit()
    return {"mensagem": "Cadastro realizado. Confirme o e-mail para ativar o acesso.", "usuario_id": user.id}


@router.post("/auth/verificar-email")
def verificar_email(dados: VerifyEmail, db: Session = Depends(get_db)):
    record = db.scalar(select(VerificacaoEmail).where(
        VerificacaoEmail.usuario_id == dados.usuario_id,
        VerificacaoEmail.utilizado.is_(False),
    ).order_by(VerificacaoEmail.id.desc()))
    if record is None:
        raise HTTPException(status_code=400, detail="Código inválido ou expirado.")
    if record.expira_em.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Código inválido ou expirado.")
    if record.tentativas >= 5:
        raise HTTPException(status_code=429, detail="Limite de tentativas excedido.")
    record.tentativas += 1
    if not secrets.compare_digest(record.codigo_hash, code_hash(dados.codigo)):
        db.commit()
        raise HTTPException(status_code=400, detail="Código inválido.")
    record.utilizado = True
    user = db.get(Usuario, dados.usuario_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    user.email_verificado = True
    audit(db, user.id, "EMAIL_CONFIRMADO", "usuario", user.id)
    db.commit()
    return {"mensagem": "E-mail confirmado com sucesso."}


@router.post("/auth/recuperar-senha")
def recuperar_senha(dados: PasswordRecovery, db: Session = Depends(get_db)):
    email = str(dados.email).lower()
    user = db.scalar(select(Usuario).where(func.lower(Usuario.email) == email))
    if user is not None and user.ativo:
        code = generate_code()
        record = VerificacaoEmail(
            usuario_id=user.id,
            codigo_hash=code_hash(code),
            expira_em=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        db.add(record)
        db.commit()
        try:
            send_email(email, "Devs Soluntions - Recuperação de senha", f"Seu código de recuperação é: {code}")
        except EmailSendError:
            return {"mensagem": "Se a conta existir, um código será enviado."}
    return {"mensagem": "Se a conta existir, um código será enviado."}


@router.post("/auth/redefinir-senha")
def redefinir_senha(dados: PasswordReset, db: Session = Depends(get_db)):
    record = db.scalar(select(VerificacaoEmail).where(
        VerificacaoEmail.usuario_id == dados.usuario_id,
        VerificacaoEmail.utilizado.is_(False),
    ).order_by(VerificacaoEmail.id.desc()))
    if record is None or record.expira_em.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Código inválido ou expirado.")
    if record.tentativas >= 5:
        raise HTTPException(status_code=429, detail="Limite de tentativas excedido.")
    record.tentativas += 1
    if not secrets.compare_digest(record.codigo_hash, code_hash(dados.codigo)):
        db.commit()
        raise HTTPException(status_code=400, detail="Código inválido.")
    user = db.get(Usuario, dados.usuario_id)
    if user is None or not user.ativo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    user.senha_hash = hash_password(dados.senha_nova)
    record.utilizado = True
    audit(db, user.id, "SENHA_REDEFINIDA", "usuario", user.id)
    db.commit()
    return {"mensagem": "Senha redefinida."}


@router.post("/auth/login")
def login(dados: LoginRequest, db: Session = Depends(get_db)):
    email = str(dados.email).lower()
    user = db.scalar(select(Usuario).where(func.lower(Usuario.email) == email))
    valid = user is not None and user.ativo and verify_password(dados.senha, user.senha_hash)
    if not valid:
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")
    if not user.email_verificado:
        raise HTTPException(status_code=403, detail="Confirme seu e-mail antes de entrar.")

    code = generate_code()
    challenge = DesafioAutenticacao(
        id=secrets.token_urlsafe(32),
        usuario_id=user.id,
        codigo_hash=code_hash(code),
        expira_em=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db.add(challenge)
    db.commit()
    try:
        send_email(email, "Devs Soluntions - Código de acesso", f"Seu código de acesso é: {code}")
    except EmailSendError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return {"challenge_id": challenge.id, "expira_em": challenge.expira_em}


@router.post("/auth/verificar-2fa")
def verificar_2fa(dados: Verify2FA, db: Session = Depends(get_db)):
    challenge = db.get(DesafioAutenticacao, dados.challenge_id)
    if challenge is None or challenge.utilizado:
        raise HTTPException(status_code=400, detail="Desafio inválido ou já utilizado.")
    if challenge.expira_em.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Desafio expirado.")
    if challenge.tentativas >= 5:
        raise HTTPException(status_code=429, detail="Limite de tentativas excedido.")
    challenge.tentativas += 1
    if not secrets.compare_digest(challenge.codigo_hash, code_hash(dados.codigo)):
        db.commit()
        raise HTTPException(status_code=400, detail="Código inválido.")
    user = db.get(Usuario, challenge.usuario_id)
    if user is None or not user.ativo or not user.email_verificado:
        raise HTTPException(status_code=403, detail="Conta indisponível.")
    challenge.utilizado = True
    db.commit()
    return {"token": create_token(user), "usuario": {
        "id": user.id, "nome": user.nome, "email": user.email,
        "telefone": user.telefone, "tipo": user.tipo,
    }}


@router.post("/auth/reenviar-codigo")
def reenviar_codigo(dados: dict, db: Session = Depends(get_db)):
    old = db.get(DesafioAutenticacao, dados.get("challenge_id", ""))
    if old is None:
        raise HTTPException(status_code=404, detail="Desafio não encontrado.")
    if old.criado_em.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc) - timedelta(seconds=60):
        raise HTTPException(status_code=429, detail="Aguarde antes de solicitar outro código.")
    user = db.get(Usuario, old.usuario_id)
    code = generate_code()
    new = DesafioAutenticacao(
        id=secrets.token_urlsafe(32),
        usuario_id=user.id,
        codigo_hash=code_hash(code),
        expira_em=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    old.utilizado = True
    db.add(new)
    db.commit()
    try:
        send_email(user.email, "Devs Soluntions - Novo código de acesso", f"Seu código de acesso é: {code}")
    except EmailSendError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return {"challenge_id": new.id, "expira_em": new.expira_em}


@router.post("/usuarios/bootstrap-secretaria")
def bootstrap_secretaria(dados: UsuarioAdminCreate, x_bootstrap_token: str = Header(default=""), db: Session = Depends(get_db)):
    if not settings.bootstrap_token or not secrets.compare_digest(x_bootstrap_token, settings.bootstrap_token):
        raise HTTPException(status_code=403, detail="Token administrativo inválido.")
    if db.scalar(select(func.count()).select_from(Usuario)):
        raise HTTPException(status_code=409, detail="Provisionamento administrativo já utilizado.")
    if dados.tipo != "secretaria":
        raise HTTPException(status_code=400, detail="Tipo inválido.")
    user = Usuario(
        nome=dados.nome, email=str(dados.email).lower(), telefone=dados.telefone,
        senha_hash=hash_password(dados.senha), tipo="secretaria",
        email_verificado=True, ativo=True,
    )
    db.add(user)
    db.commit()
    return {"mensagem": "Secretaria provisionada.", "usuario": {"id": user.id, "nome": user.nome, "email": user.email, "tipo": user.tipo}}


@router.get("/usuarios/me")
def meu_perfil(user: Usuario = Depends(require_role("professor", "secretaria")), db: Session = Depends(get_db)):
    return {"id": user.id, "nome": user.nome, "email": user.email, "telefone": user.telefone, "tipo": user.tipo, "email_verificado": user.email_verificado, "ativo": user.ativo}


@router.patch("/usuarios/me")
def atualizar_perfil(dados: UsuarioUpdate, user: Usuario = Depends(require_role("professor", "secretaria")), db: Session = Depends(get_db)):
    if dados.nome is not None:
        user.nome = dados.nome
    if dados.telefone is not None:
        user.telefone = dados.telefone
    audit(db, user.id, "PERFIL_ALTERADO", "usuario", user.id)
    db.commit()
    return {"mensagem": "Perfil atualizado."}


@router.patch("/usuarios/me/senha")
def alterar_senha(dados: PasswordChange, user: Usuario = Depends(require_role("professor", "secretaria")), db: Session = Depends(get_db)):
    if not verify_password(dados.senha_atual, user.senha_hash):
        raise HTTPException(status_code=400, detail="Senha atual inválida.")
    user.senha_hash = hash_password(dados.senha_nova)
    audit(db, user.id, "SENHA_ALTERADA", "usuario", user.id)
    db.commit()
    return {"mensagem": "Senha alterada."}


@router.get("/usuarios")
def listar_usuarios(skip: int = 0, limit: int = Query(default=50, le=100), _=Depends(require_role("secretaria")), db: Session = Depends(get_db)):
    users = db.scalars(select(Usuario).offset(skip).limit(limit)).all()
    return [{"id": u.id, "nome": u.nome, "email": u.email, "telefone": u.telefone, "tipo": u.tipo, "email_verificado": u.email_verificado, "ativo": u.ativo} for u in users]


@router.patch("/usuarios/{usuario_id}")
def editar_usuario(usuario_id: int, dados: UsuarioUpdate, actor: Usuario = Depends(require_role("secretaria")), db: Session = Depends(get_db)):
    user = db.get(Usuario, usuario_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    for key, value in dados.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    audit(db, actor.id, "USUARIO_ALTERADO", "usuario", user.id)
    db.commit()
    return {"id": user.id, "nome": user.nome, "email": user.email, "telefone": user.telefone, "tipo": user.tipo, "ativo": user.ativo}


@router.post("/usuarios/admin", status_code=201)
def cadastrar_usuario_admin(dados: UsuarioAdminCreate, actor: Usuario = Depends(require_role("secretaria")), db: Session = Depends(get_db)):
    if dados.tipo not in ("professor", "secretaria"):
        raise HTTPException(status_code=400, detail="Tipo inválido.")
    email = str(dados.email).lower()
    if db.scalar(select(Usuario).where(func.lower(Usuario.email) == email)):
        raise HTTPException(status_code=409, detail="Já existe uma conta com este e-mail.")
    if dados.tipo == "professor" and not verify_domain(email):
        raise HTTPException(status_code=400, detail="Domínio de professor não autorizado.")
    user = Usuario(nome=dados.nome, email=email, telefone=dados.telefone, senha_hash=hash_password(dados.senha), tipo=dados.tipo, email_verificado=True, ativo=True)
    db.add(user)
    db.flush()
    audit(db, actor.id, "USUARIO_CRIADO", "usuario", user.id)
    db.commit()
    return {"id": user.id, "nome": user.nome, "email": user.email, "tipo": user.tipo}


@router.patch("/usuarios/{usuario_id}/inativar")
def inativar_usuario(usuario_id: int, actor: Usuario = Depends(require_role("secretaria")), db: Session = Depends(get_db)):
    user = db.get(Usuario, usuario_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    user.ativo = False
    audit(db, actor.id, "USUARIO_INATIVADO", "usuario", user.id)
    db.commit()
    return {"mensagem": "Usuário inativado."}


@router.get("/salas")
def listar_salas(
    nome: str | None = None,
    bloco: str | None = None,
    tipo: str | None = None,
    capacidade: int | None = None,
    skip: int = 0,
    limit: int = Query(default=50, le=100),
    _=Depends(require_role("professor", "secretaria")),
    db: Session = Depends(get_db),
):
    statement = select(Sala)
    if nome:
        statement = statement.where(Sala.nome.ilike(f"%{nome}%"))
    if bloco:
        statement = statement.where(Sala.bloco.ilike(f"%{bloco}%"))
    if tipo:
        statement = statement.where(Sala.tipo.ilike(f"%{tipo}%"))
    if capacidade:
        statement = statement.where(Sala.capacidade >= capacidade)
    statement = statement.offset(skip).limit(limit)
    return db.scalars(statement).all()


@router.get("/salas/disponibilidade")
def consultar_disponibilidade(
    data,
    hora_inicio,
    hora_fim,
    _=Depends(require_role("professor", "secretaria")),
    db: Session = Depends(get_db),
):
    from datetime import date as date_type, time as time_type
    try:
        dia = date_type.fromisoformat(str(data))
        inicio = time_type.fromisoformat(str(hora_inicio))
        fim = time_type.fromisoformat(str(hora_fim))
    except ValueError:
        raise HTTPException(status_code=400, detail="Data ou horário inválido.")
    if inicio >= fim:
        raise HTTPException(status_code=400, detail="hora_inicio deve ser menor que hora_fim.")
    salas = db.scalars(select(Sala).where(Sala.disponivel.is_(True))).all()
    return [
        {"id": sala.id, "nome": sala.nome, "disponivel": not has_reservation_conflict(db, sala.id, dia, inicio, fim)}
        for sala in salas
    ]


@router.get("/salas/{sala_id}")
def buscar_sala(sala_id: int, _=Depends(require_role("professor", "secretaria")), db: Session = Depends(get_db)):
    sala = db.get(Sala, sala_id)
    if sala is None:
        raise HTTPException(status_code=404, detail="Sala não encontrada.")
    return sala


@router.post("/salas", status_code=201)
def criar_sala(dados: SalaCreate, actor: Usuario = Depends(require_role("secretaria")), db: Session = Depends(get_db)):
    existing = db.scalar(select(Sala).where(func.lower(Sala.nome) == dados.nome.lower(), Sala.bloco == dados.bloco))
    if existing:
        raise HTTPException(status_code=409, detail="Já existe uma sala com este nome neste bloco.")
    sala = Sala(**dados.model_dump())
    db.add(sala)
    db.flush()
    audit(db, actor.id, "SALA_CRIADA", "sala", sala.id)
    db.commit()
    return sala


@router.put("/salas/{sala_id}")
@router.patch("/salas/{sala_id}")
def editar_sala(sala_id: int, dados: SalaUpdate, actor: Usuario = Depends(require_role("secretaria")), db: Session = Depends(get_db)):
    sala = db.get(Sala, sala_id)
    if sala is None:
        raise HTTPException(status_code=404, detail="Sala não encontrada.")
    for key, value in dados.model_dump(exclude_unset=True).items():
        setattr(sala, key, value)
    audit(db, actor.id, "SALA_ALTERADA", "sala", sala.id)
    db.commit()
    return sala


@router.delete("/salas/{sala_id}", status_code=204)
def inativar_sala(sala_id: int, actor: Usuario = Depends(require_role("secretaria")), db: Session = Depends(get_db)):
    sala = db.get(Sala, sala_id)
    if sala is None:
        raise HTTPException(status_code=404, detail="Sala não encontrada.")
    sala.disponivel = False
    audit(db, actor.id, "SALA_INATIVADA", "sala", sala.id)
    db.commit()
    return None


def has_reservation_conflict(db: Session, sala_id: int, data, inicio, fim) -> bool:
    statement = select(Reserva).where(
        Reserva.sala_id == sala_id,
        Reserva.data == data,
        Reserva.status.in_(("pendente", "aprovada")),
        Reserva.hora_inicio < fim,
        Reserva.hora_fim > inicio,
    )
    return db.scalar(statement.limit(1)) is not None


@router.post("/reservas", status_code=201)
def criar_reserva(dados: ReservaCreate, actor: Usuario = Depends(require_role("professor", "secretaria")), db: Session = Depends(get_db)):
    if dados.hora_inicio >= dados.hora_fim:
        raise HTTPException(status_code=400, detail="hora_inicio deve ser menor que hora_fim.")
    sala = db.get(Sala, dados.sala_id)
    if sala is None:
        raise HTTPException(status_code=404, detail="Sala não encontrada.")
    if not sala.disponivel:
        raise HTTPException(status_code=409, detail="Sala indisponível.")
    if actor.tipo == "professor":
        professor_id = actor.id
    else:
        professor_id = dados.professor_id
        if professor_id is None:
            raise HTTPException(status_code=400, detail="Secretaria deve informar professor_id.")
    professor = db.get(Usuario, professor_id)
    if professor is None or professor.tipo != "professor" or not professor.ativo:
        raise HTTPException(status_code=404, detail="Professor não encontrado ou inativo.")
    if has_reservation_conflict(db, dados.sala_id, dados.data, dados.hora_inicio, dados.hora_fim):
        raise HTTPException(status_code=409, detail="A sala já possui reserva nesse horário.")
    reserva = Reserva(
        sala_id=dados.sala_id,
        professor_id=professor_id,
        criado_por_id=actor.id,
        data=dados.data,
        hora_inicio=dados.hora_inicio,
        hora_fim=dados.hora_fim,
        status="aprovada" if actor.tipo == "secretaria" else "pendente",
    )
    db.add(reserva)
    db.flush()
    audit(db, actor.id, "RESERVA_CRIADA", "reserva", reserva.id)
    db.commit()
    return reserva


@router.get("/reservas")
def listar_reservas(
    minhas: bool = False,
    status_filtro: str | None = Query(default=None, alias="status"),
    actor: Usuario = Depends(require_role("professor", "secretaria")),
    skip: int = 0,
    limit: int = Query(default=50, le=100),
    db: Session = Depends(get_db),
):
    statement = select(Reserva)
    if actor.tipo == "professor":
        statement = statement.where(Reserva.professor_id == actor.id)
    elif minhas:
        statement = statement.where(Reserva.criado_por_id == actor.id)
    if status_filtro:
        statement = statement.where(Reserva.status == status_filtro)
    statement = statement.offset(skip).limit(limit).order_by(Reserva.data.desc(), Reserva.hora_inicio.desc())
    return db.scalars(statement).all()


@router.get("/reservas/{reserva_id}")
def buscar_reserva(reserva_id: int, actor: Usuario = Depends(require_role("professor", "secretaria")), db: Session = Depends(get_db)):
    reserva = db.get(Reserva, reserva_id)
    if reserva is None:
        raise HTTPException(status_code=404, detail="Reserva não encontrada.")
    if actor.tipo == "professor" and reserva.professor_id != actor.id:
        raise HTTPException(status_code=403, detail="Você não pode consultar esta reserva.")
    return reserva


@router.patch("/reservas/{reserva_id}/aprovar")
def aprovar_reserva(reserva_id: int, actor: Usuario = Depends(require_role("secretaria")), db: Session = Depends(get_db)):
    reserva = db.get(Reserva, reserva_id)
    if reserva is None:
        raise HTTPException(status_code=404, detail="Reserva não encontrada.")
    if reserva.status != "pendente":
        raise HTTPException(status_code=409, detail="A reserva não está pendente.")
    if has_reservation_conflict(db, reserva.sala_id, reserva.data, reserva.hora_inicio, reserva.hora_fim):
        existing = db.scalar(select(Reserva).where(
            Reserva.id != reserva.id, Reserva.sala_id == reserva.sala_id, Reserva.data == reserva.data,
            Reserva.status == "aprovada", Reserva.hora_inicio < reserva.hora_fim, Reserva.hora_fim > reserva.hora_inicio,
        ).limit(1))
        if existing:
            raise HTTPException(status_code=409, detail="Existe conflito de horário.")
    reserva.status = "aprovada"
    audit(db, actor.id, "RESERVA_APROVADA", "reserva", reserva.id)
    db.commit()
    return reserva


@router.patch("/reservas/{reserva_id}/rejeitar")
def rejeitar_reserva(reserva_id: int, dados: Motivo, actor: Usuario = Depends(require_role("secretaria")), db: Session = Depends(get_db)):
    reserva = db.get(Reserva, reserva_id)
    if reserva is None:
        raise HTTPException(status_code=404, detail="Reserva não encontrada.")
    if reserva.status != "pendente":
        raise HTTPException(status_code=409, detail="A reserva não está pendente.")
    reserva.status = "rejeitada"
    reserva.motivo_rejeicao = dados.motivo
    audit(db, actor.id, "RESERVA_REJEITADA", "reserva", reserva.id)
    db.commit()
    return reserva


@router.patch("/reservas/{reserva_id}/solicitar-cancelamento")
def solicitar_cancelamento(reserva_id: int, dados: Motivo, actor: Usuario = Depends(require_role("professor")), db: Session = Depends(get_db)):
    reserva = db.get(Reserva, reserva_id)
    if reserva is None:
        raise HTTPException(status_code=404, detail="Reserva não encontrada.")
    if reserva.professor_id != actor.id:
        raise HTTPException(status_code=403, detail="Reserva pertence a outro professor.")
    if reserva.status != "aprovada" or reserva.status_cancelamento == "pendente":
        raise HTTPException(status_code=409, detail="Cancelamento não elegível.")
    reserva.status_cancelamento = "pendente"
    reserva.motivo_cancelamento = dados.motivo
    audit(db, actor.id, "CANCELAMENTO_SOLICITADO", "reserva", reserva.id)
    db.commit()
    return reserva


@router.patch("/reservas/{reserva_id}/aprovar-cancelamento")
def aprovar_cancelamento(reserva_id: int, actor: Usuario = Depends(require_role("secretaria")), db: Session = Depends(get_db)):
    reserva = db.get(Reserva, reserva_id)
    if reserva is None:
        raise HTTPException(status_code=404, detail="Reserva não encontrada.")
    if reserva.status_cancelamento != "pendente":
        raise HTTPException(status_code=409, detail="Não existe solicitação pendente.")
    reserva.status_cancelamento = "aprovado"
    reserva.status = "cancelada"
    audit(db, actor.id, "CANCELAMENTO_APROVADO", "reserva", reserva.id)
    db.commit()
    return reserva


@router.patch("/reservas/{reserva_id}/rejeitar-cancelamento")
def rejeitar_cancelamento(reserva_id: int, dados: Motivo, actor: Usuario = Depends(require_role("secretaria")), db: Session = Depends(get_db)):
    reserva = db.get(Reserva, reserva_id)
    if reserva is None:
        raise HTTPException(status_code=404, detail="Reserva não encontrada.")
    if reserva.status_cancelamento != "pendente":
        raise HTTPException(status_code=409, detail="Não existe solicitação pendente.")
    reserva.status_cancelamento = "rejeitado"
    reserva.motivo_cancelamento = dados.motivo
    audit(db, actor.id, "CANCELAMENTO_REJEITADO", "reserva", reserva.id)
    db.commit()
    return reserva


@router.get("/historico/reservas")
def historico_reservas(actor: Usuario = Depends(require_role("professor", "secretaria")), db: Session = Depends(get_db)):
    statement = select(Reserva)
    if actor.tipo == "professor":
        statement = statement.where(Reserva.professor_id == actor.id)
    return db.scalars(statement.order_by(Reserva.atualizado_em.desc())).all()


@router.get("/relatorios")
def relatorios(_=Depends(require_role("secretaria")), db: Session = Depends(get_db)):
    counts = {}
    counts["total_salas"] = db.scalar(select(func.count()).select_from(Sala)) or 0
    counts["total_reservas"] = db.scalar(select(func.count()).select_from(Reserva)) or 0
    for value in ("pendente", "aprovada", "rejeitada", "cancelada"):
        counts[f"reservas_{value}s"] = db.scalar(select(func.count()).select_from(Reserva).where(Reserva.status == value)) or 0
    usage = db.execute(
        select(Reserva.sala_id, func.count(Reserva.id))
        .group_by(Reserva.sala_id)
        .order_by(func.count(Reserva.id).desc())
    ).all()
    counts["salas_mais_utilizadas"] = [{"sala_id": sala_id, "reservas": total} for sala_id, total in usage]
    return counts
