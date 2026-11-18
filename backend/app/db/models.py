from datetime import date, datetime, time, timezone
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Usuario(Base):
    __tablename__ = "usuarios"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    telefone: Mapped[str | None] = mapped_column(String(30))
    senha_hash: Mapped[str] = mapped_column(Text, nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    email_verificado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class Sala(Base):
    __tablename__ = "salas"
    __table_args__ = (CheckConstraint("capacidade > 0", name="ck_salas_capacidade"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    bloco: Mapped[str] = mapped_column(String(80), nullable=False)
    andar: Mapped[int] = mapped_column(Integer, nullable=False)
    tipo: Mapped[str] = mapped_column(String(80), nullable=False)
    capacidade: Mapped[int] = mapped_column(Integer, nullable=False)
    disponivel: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class Reserva(Base):
    __tablename__ = "reservas"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sala_id: Mapped[int] = mapped_column(ForeignKey("salas.id"), index=True, nullable=False)
    professor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True, nullable=False)
    criado_por_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    data: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    hora_inicio: Mapped[time] = mapped_column(Time, nullable=False)
    hora_fim: Mapped[time] = mapped_column(Time, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pendente", index=True, nullable=False)
    status_cancelamento: Mapped[str] = mapped_column(String(20), default="nenhum", nullable=False)
    motivo_rejeicao: Mapped[str | None] = mapped_column(Text)
    motivo_cancelamento: Mapped[str | None] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class DesafioAutenticacao(Base):
    __tablename__ = "desafios_autenticacao"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True, nullable=False)
    codigo_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    tentativas: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    utilizado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class VerificacaoEmail(Base):
    __tablename__ = "verificacoes_email"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True, nullable=False)
    codigo_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    tentativas: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    utilizado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class AuditoriaAcao(Base):
    __tablename__ = "auditoria_acoes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), index=True)
    acao: Mapped[str] = mapped_column(String(80), nullable=False)
    entidade: Mapped[str] = mapped_column(String(80), nullable=False)
    entidade_id: Mapped[str] = mapped_column(String(80), nullable=False)
    detalhes: Mapped[str | None] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True, nullable=False)
