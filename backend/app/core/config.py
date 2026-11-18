import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./devs.db")
    jwt_secret: str = os.getenv("JWT_SECRET_KEY", "")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "30"))
    auth_code_secret: str = os.getenv("AUTH_CODE_SECRET", "")
    allowed_domains: tuple[str, ...] = tuple(
        domain.strip().lower()
        for domain in os.getenv("SENAI_ALLOWED_EMAIL_DOMAINS", "docente.senai.br").split(",")
        if domain.strip()
    )
    cors_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    )
    smtp_host: str = os.getenv("SMTP_HOST", "")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str = os.getenv("SMTP_USERNAME", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_from_email: str = os.getenv("SMTP_FROM_EMAIL", "")
    smtp_use_tls: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    bootstrap_token: str = os.getenv("SECRETARIA_BOOTSTRAP_TOKEN", "")
    testing: bool = os.getenv("TESTING", "false").lower() == "true"


settings = Settings()
