"""Відправка листів із кодом. Без SMTP-налаштувань працює dev-режим: код друкується в терміналі."""
import os
import smtplib
import traceback
from email.message import EmailMessage

OUTBOX: list[dict] = []     # останні «надіслані» коди (dev-режим і тести)


def smtp_configured() -> bool:
    return bool(os.getenv("SMTP_HOST"))


def send_code(to: str, code: str, purpose: str) -> None:
    what = "реєстрації" if purpose == "register" else "скидання пароля"
    if not smtp_configured():
        OUTBOX.append({"to": to, "code": code, "purpose": purpose})
        del OUTBOX[:-50]
        print(f"\n📧 [DEV] Код для {to}: {code}  (для {what})\n", flush=True)
        return
    try:
        msg = EmailMessage()
        msg["Subject"] = "book_ukma: код підтвердження"
        msg["From"] = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", "book_ukma@localhost"))
        msg["To"] = to
        msg.set_content(
            f"Ваш код для {what} у системі бронювання приміщень НаУКМА: {code}\n\n"
            "Код дійсний 10 хвилин. Якщо ви його не запитували — просто проігноруйте цей лист."
        )
        with smtplib.SMTP(os.environ["SMTP_HOST"], int(os.getenv("SMTP_PORT", "587")), timeout=15) as s:
            s.starttls()
            s.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
            s.send_message(msg)
    except Exception:
        traceback.print_exc()   # користувач побачить «код не прийшов» і зможе повторити
