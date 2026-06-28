import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import get_settings


def send_verification_email(to_email: str, code: str, nom: str | None = None) -> None:
    settings = get_settings()

    sender = settings.smtp_from or settings.smtp_user

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Faypal — Code de vérification : {code}"
    msg["From"]    = f"Faypal Health <{sender}>"
    msg["To"]      = to_email

    display_name = nom or to_email

    html = f"""
    <html>
    <body style="font-family:Arial,sans-serif;background:#f0f4f8;padding:40px;margin:0;">
      <div style="max-width:480px;margin:auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;">
          <span style="font-size:20px;font-weight:bold;color:#1A56DB;">Fay<span style="color:#0D9488;">pal</span></span>
          <span style="background:#dbeafe;color:#1d4ed8;font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;letter-spacing:1px;">SANTÉ</span>
        </div>
        <p style="color:#64748b;font-size:14px;margin:0 0 8px;">Bonjour <strong style="color:#0f172a;">{display_name}</strong>,</p>
        <p style="color:#0f172a;font-size:14px;margin:0 0 24px;">
          Voici votre code de vérification pour activer votre compte Faypal :
        </p>
        <div style="text-align:center;background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px;">
          <span style="font-size:40px;font-weight:900;letter-spacing:14px;color:#1A56DB;font-family:monospace;">{code}</span>
        </div>
        <p style="color:#64748b;font-size:13px;margin:0 0 4px;">
          ⏱ Ce code est valable <strong>10 minutes</strong>.
        </p>
        <p style="color:#94a3b8;font-size:12px;margin:0 0 24px;">
          Si vous n'avez pas demandé ce code, ignorez cet email.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;">
        <p style="color:#cbd5e1;font-size:11px;margin:0;">
          Équipe Faypal · Ministère de la Santé et de l'Action Sociale · Sénégal
        </p>
      </div>
    </body>
    </html>
    """

    msg.attach(MIMEText(html, "html"))

    context = ssl.create_default_context()
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.ehlo()
        server.starttls(context=context)
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(sender, to_email, msg.as_string())
