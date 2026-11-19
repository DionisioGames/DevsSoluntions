import smtplib
from email.message import EmailMessage

from app.core.config import settings


class EmailSendError(RuntimeError):
    pass


class EmailService:
    def send(self, recipient: str, subject: str, body: str) -> None:
        if not settings.smtp_host or not settings.smtp_from_email:
            raise EmailSendError("SMTP não configurado: autenticação por e-mail indisponível.")

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = settings.smtp_from_email
        message["To"] = recipient
        message.set_content(body)

        try:
            if settings.smtp_port == 465:
                server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10)
            else:
                server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10)
                if settings.smtp_use_tls:
                    server.starttls()
            with server:
                if settings.smtp_username:
                    server.login(settings.smtp_username, settings.smtp_password)
                server.send_message(message)
        except (smtplib.SMTPException, TimeoutError, OSError) as exc:
            raise EmailSendError("Não foi possível enviar o e-mail.") from exc


class FakeEmailService(EmailService):
    sent: list[tuple[str, str, str]] = []

    def send(self, recipient: str, subject: str, body: str) -> None:
        self.sent.append((recipient, subject, body))
        print(f"[TESTING] E-mail para {recipient}: {body}", flush=True)
