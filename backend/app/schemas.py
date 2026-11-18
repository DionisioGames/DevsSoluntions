from datetime import date, datetime, time
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UsuarioCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: EmailStr
    telefone: str | None = Field(default=None, max_length=30)
    senha: str = Field(min_length=8, max_length=128)


class UsuarioAdminCreate(UsuarioCreate):
    tipo: str


class UsuarioUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=120)
    telefone: str | None = Field(default=None, max_length=30)


class UsuarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    email: EmailStr
    telefone: str | None
    tipo: str
    email_verificado: bool
    ativo: bool


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


class ChallengeResponse(BaseModel):
    challenge_id: str
    expira_em: datetime


class Verify2FA(BaseModel):
    challenge_id: str
    codigo: str = Field(pattern=r"^\d{6}$")


class ResendCode(BaseModel):
    challenge_id: str


class VerifyEmail(BaseModel):
    usuario_id: int
    codigo: str = Field(pattern=r"^\d{6}$")


class SalaCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    bloco: str = Field(min_length=1, max_length=80)
    andar: int
    tipo: str = Field(min_length=1, max_length=80)
    capacidade: int = Field(gt=0)
    disponivel: bool = True


class SalaUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=120)
    bloco: str | None = Field(default=None, min_length=1, max_length=80)
    andar: int | None = None
    tipo: str | None = Field(default=None, min_length=1, max_length=80)
    capacidade: int | None = Field(default=None, gt=0)
    disponivel: bool | None = None


class SalaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    bloco: str
    andar: int
    tipo: str
    capacidade: int
    disponivel: bool


class ReservaCreate(BaseModel):
    sala_id: int
    professor_id: int | None = None
    data: date
    hora_inicio: time
    hora_fim: time


class ReservaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sala_id: int
    professor_id: int
    criado_por_id: int
    data: date
    hora_inicio: time
    hora_fim: time
    status: str
    status_cancelamento: str
    motivo_rejeicao: str | None = None
    motivo_cancelamento: str | None = None


class Motivo(BaseModel):
    motivo: str = Field(min_length=3, max_length=500)


class PasswordChange(BaseModel):
    senha_atual: str
    senha_nova: str = Field(min_length=8, max_length=128)


class PasswordRecovery(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    usuario_id: int
    codigo: str = Field(pattern=r"^\d{6}$")
    senha_nova: str = Field(min_length=8, max_length=128)
