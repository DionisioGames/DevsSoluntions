# Devs Soluntions — frontend

Aplicação React, TypeScript e Vite para autenticação e gestão de salas e reservas. O cliente consome a API FastAPI existente; não há dados de demonstração nem endpoints substitutos.

## Requisitos

- Node.js 18 ou superior e npm
- Backend FastAPI acessível em `http://127.0.0.1:8000`

## Executar localmente

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

O Vite encaminha `/api/*` para `http://127.0.0.1:8000/*` e remove o prefixo `/api`. Para usar outra URL, defina `VITE_API_BASE_URL` em `.env`; a URL precisa apontar para a API que expõe as rotas do backend.

## Fluxos disponíveis

- Login (`POST /auth/login`) seguido obrigatoriamente por verificação do código enviado por e-mail (`POST /auth/verificar-2fa`). A tela também permite solicitar reenvio (`POST /auth/reenviar-codigo`).
- Painel e proteção de rotas por perfil professor/secretaria; logout local.
- Consulta de salas e solicitações de reserva por professores.
- Listagem geral de reservas para secretaria, com aprovação (`PATCH /reservas/{id}/aprovar`) e rejeição (`PATCH /reservas/{id}/rejeitar`, corpo `{ "motivo": "..." }`).
- Consulta de contagens do painel de secretaria por `GET /relatorios`.

Criação de reserva usa `POST /reservas` com `sala_id`, `data`, `hora_inicio` e `hora_fim`; horários são enviados como `HH:mm:ss`. A API determina o professor a partir do token de um professor autenticado, portanto o frontend não envia `professor_id`.

## Sessão e segurança

O JWT é armazenado em `sessionStorage` e removido ao sair ou quando a API rejeita a sessão. Ele permanece acessível a JavaScript na origem, portanto uma vulnerabilidade XSS ainda poderia expô-lo; uma solução futura mais resistente a XSS usaria cookie `HttpOnly`, com suporte correspondente no backend. Senha e código 2FA são mantidos apenas no estado da tela enquanto necessários e não são persistidos.

## Build

```powershell
npm run build
```
