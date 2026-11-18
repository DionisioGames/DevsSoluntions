import re

from app.api.routes import fake_email
from app.db.models import DesafioAutenticacao, Usuario
from app.core.security import verify_password
from sqlalchemy import select


def extract_code(email_sent):
    return re.search(r"(\d{6})", email_sent[-1][2]).group(1)


def verify_user_email(client, db, email):
    user = db.scalar(select(Usuario).where(Usuario.email == email))
    sent_before = len(fake_email.sent)
    response = client.post("/auth/verificar-email", json={"usuario_id": user.id, "codigo": extract_code(fake_email.sent[sent_before - 1:])})
    assert response.status_code == 200


def test_public_registration_rejects_untrusted_domain(client):
    response = client.post("/usuarios/cadastro", json={
        "nome": "Ana",
        "email": "ana@docente.senai.br.site.com",
        "senha": "SenhaSegura123",
    })
    assert response.status_code == 400


def test_registration_email_verification_and_login_2fa(client, db):
    fake_email.sent.clear()
    response = client.post("/usuarios/cadastro", json={
        "nome": "Joao",
        "email": "joao@docente.senai.br",
        "senha": "SenhaSegura123",
    })
    assert response.status_code == 201
    user_id = response.json()["usuario_id"]
    code = extract_code(fake_email.sent)

    response = client.post("/auth/verificar-email", json={"usuario_id": user_id, "codigo": code})
    assert response.status_code == 200

    response = client.post("/auth/login", json={"email": "joao@docente.senai.br", "senha": "SenhaSegura123"})
    assert response.status_code == 200
    assert "challenge_id" in response.json()
    assert "token" not in response.json()

    challenge_id = response.json()["challenge_id"]
    code = extract_code(fake_email.sent)
    response = client.post("/auth/verificar-2fa", json={"challenge_id": challenge_id, "codigo": code})
    assert response.status_code == 200
    assert "token" in response.json()


def test_wrong_password_and_wrong_2fa(client, db):
    fake_email.sent.clear()
    client.post("/usuarios/cadastro", json={"nome": "Maria", "email": "maria@docente.senai.br", "senha": "SenhaSegura123"})
    user_id = db.scalar(select(Usuario).where(Usuario.email == "maria@docente.senai.br")).id
    code = extract_code(fake_email.sent)
    client.post("/auth/verificar-email", json={"usuario_id": user_id, "codigo": code})

    assert client.post("/auth/login", json={"email": "maria@docente.senai.br", "senha": "Errada123"}).status_code == 401
    login = client.post("/auth/login", json={"email": "maria@docente.senai.br", "senha": "SenhaSegura123"})
    assert login.status_code == 200
    bad = client.post("/auth/verificar-2fa", json={"challenge_id": login.json()["challenge_id"], "codigo": "000000"})
    assert bad.status_code == 400


def test_secretaria_can_create_room_and_reservation(client, db):
    from app.core.config import settings
    settings.bootstrap_token = "bootstrap-test"
    response = client.post("/usuarios/bootstrap-secretaria", headers={"x-bootstrap-token": "bootstrap-test"}, json={
        "nome": "Secretaria",
        "email": "secretaria@example.com",
        "telefone": None,
        "senha": "SenhaSegura123",
        "tipo": "secretaria",
    })
    assert response.status_code == 200

    fake_email.sent.clear()
    client.post("/usuarios/cadastro", json={"nome": "Professor", "email": "professor@docente.senai.br", "senha": "SenhaSegura123"})
    professor = db.scalar(select(Usuario).where(Usuario.email == "professor@docente.senai.br"))
    code = extract_code(fake_email.sent)
    client.post("/auth/verificar-email", json={"usuario_id": professor.id, "codigo": code})

    login = client.post("/auth/login", json={"email": "secretaria@example.com", "senha": "SenhaSegura123"})
    assert login.status_code == 200
    code = extract_code(fake_email.sent)
    secret_2fa = client.post("/auth/verificar-2fa", json={"challenge_id": login.json()["challenge_id"], "codigo": code})
    token = secret_2fa.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    sala = client.post("/salas", headers=headers, json={
        "nome": "Lab 1", "bloco": "A", "andar": 1, "tipo": "Laboratorio",
        "capacidade": 30, "disponivel": True,
    })
    assert sala.status_code == 201

    reserva = client.post("/reservas", headers=headers, json={
        "sala_id": sala.json()["id"], "professor_id": professor.id,
        "data": "2026-12-01", "hora_inicio": "10:00:00", "hora_fim": "11:00:00",
    })
    assert reserva.status_code == 201
    assert reserva.json()["status"] == "aprovada"


def test_password_hash_uses_argon2(db):
    from app.core.security import hash_password
    hashed = hash_password("SenhaSegura123")
    assert hashed.startswith("$argon2")
    assert verify_password("SenhaSegura123", hashed)
