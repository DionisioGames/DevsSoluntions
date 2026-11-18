# Devs Soluntions Backend

API FastAPI para reservas de salas do SENAI, com SQLAlchemy 2, Alembic, Argon2, JWT e autenticação em duas etapas por e-mail.

## Windows / PowerShell

```powershell
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edite `.env` com `DATABASE_URL`, `JWT_SECRET_KEY`, `AUTH_CODE_SECRET`, SMTP e CORS reais. Para PostgreSQL:

```text
DATABASE_URL=postgresql+psycopg://usuario:senha@localhost:5432/devs_soluntions
```

Configure PostgreSQL e crie o banco sem executar operações destrutivas:

```powershell
psql -U postgres -c "CREATE DATABASE devs_soluntions;"
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn main.main:app --reload
```

Para testes isolados:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

Swagger: `http://127.0.0.1:8000/docs`

## Fluxo

1. Professor cadastra em `POST /usuarios/cadastro` com `@docente.senai.br`.
2. Confirma o código em `POST /auth/verificar-email`.
3. Login em `POST /auth/login` cria um desafio de cinco minutos.
4. `POST /auth/verificar-2fa` valida o código e retorna o JWT por 30 minutos.
5. Use `Authorization: Bearer <token>`.

Secretarias são provisionadas por `POST /usuarios/bootstrap-secretaria`, protegida por `SECRETARIA_BOOTSTRAP_TOKEN` e disponível apenas enquanto não houver usuários. Depois disso, elas podem criar ou editar usuários em `/usuarios/admin`.

## Segurança

- Senhas com Argon2.
- Códigos HMAC protegidos por segredo do servidor e expiração de cinco minutos.
- Máximo de cinco tentativas por desafio.
- JWT assinado por chave configurada por ambiente.
- Domínio exato `docente.senai.br`.
- CORS limitado pelas origens configuradas.
- Dados sensíveis não são retornados pela API.
- SMTP real somente quando configurado; o serviço falso existe apenas com `TESTING=true`.

## Endpoints principais

- Cadastro, perfil e usuários: `/usuarios`
- Login e 2FA: `/auth/login`, `/auth/verificar-2fa`, `/auth/reenviar-codigo`
- Verificação e recuperação: `/auth/verificar-email`, `/auth/recuperar-senha`, `/auth/redefinir-senha`
- Salas: `/salas`, `/salas/disponibilidade`
- Reservas e cancelamentos: `/reservas`
- Histórico e auditoria: `/historico/reservas`, `/relatorios`
