from email.message import EmailMessage
import smtplib

from app.core.config import get_settings


def send_email(to_email: str, subject: str, html_body: str, text_body: str | None = None) -> bool:
    settings = get_settings()
    if not (settings.smtp_host and settings.smtp_from_email):
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    message["To"] = to_email
    message.set_content(text_body or html_body)
    message.add_alternative(html_body, subtype="html")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_username and settings.smtp_password:
            server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)
    return True


def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    html = f"""
    <div style="font-family:Arial,sans-serif;background:#050505;color:#f5f5f5;padding:24px">
      <h2>Imperial Fitness</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p><a href="{reset_url}" style="color:#fff;background:#dc2626;padding:12px 16px;border-radius:8px;text-decoration:none">Restablecer contraseña</a></p>
      <p>Si no solicitaste este cambio, ignora este mensaje.</p>
    </div>
    """
    text = f"Restablece tu contraseña en: {reset_url}"
    return send_email(to_email, "Recuperación de cuenta Imperial Fitness", html, text)