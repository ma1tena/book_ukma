"""Відправка листів. Без SMTP-налаштувань працює dev-режим: лист друкується в терміналі."""
import os
import smtplib
import traceback
from email.message import EmailMessage

OUTBOX: list[dict] = []     # останні «надіслані» листи (dev-режим і тести)


def smtp_configured() -> bool:
    return bool(os.getenv("SMTP_HOST"))


def send_mail(to: str, subject: str, body: str, **meta) -> None:
    if not smtp_configured():
        OUTBOX.append({"to": to, "subject": subject, "body": body, **meta})
        del OUTBOX[:-50]
        print(f"\n📧 [DEV] Лист для {to}: {subject}\n{body}\n", flush=True)
        return
    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", "book_ukma@localhost"))
        msg["To"] = to
        msg.set_content(body)
        with smtplib.SMTP(os.environ["SMTP_HOST"], int(os.getenv("SMTP_PORT", "587")), timeout=15) as s:
            s.starttls()
            s.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
            s.send_message(msg)
    except Exception:
        traceback.print_exc()   # не валимо запит користувача через проблеми з поштою


def send_code(to: str, code: str, purpose: str) -> None:
    what = "реєстрації" if purpose == "register" else "скидання пароля"
    send_mail(to, "book_ukma: код підтвердження",
              f"Ваш код для {what} у системі бронювання приміщень НаУКМА: {code}\n\n"
              "Код дійсний 10 хвилин. Якщо ви його не запитували — просто проігноруйте цей лист.",
              code=code, purpose=purpose)
