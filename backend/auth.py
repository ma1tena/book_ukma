"""Автентифікація: реєстрація з кодом на пошту (один раз), вхід за паролем, Office 365, скидання пароля."""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from datetime import datetime, timedelta
from urllib.parse import quote, urlencode

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

import emailer
from database import get_db
from models import AccountType, AuthSession, EmailCode, User, UserRole
from schemas import PHONE_RE

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ───────── Налаштування (змінні середовища) ─────────
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")       # ОБОВ'ЯЗКОВО змінити на проді
ALLOW_GUESTS = os.getenv("ALLOW_GUESTS", "false").lower() == "true"  # true → пошти не @ukma.edu.ua реєструються як «гість»
ADMIN_EMAILS = {e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()}
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
MS_CLIENT_ID = os.getenv("MS_CLIENT_ID", "")
MS_CLIENT_SECRET = os.getenv("MS_CLIENT_SECRET", "")
MS_TENANT_ID = os.getenv("MS_TENANT_ID", "")                        # GUID тенанта НаУКМА (ukma.edu.ua)

CORP_DOMAIN = "@ukma.edu.ua"
CODE_TTL = timedelta(minutes=10)
VERIFIED_TTL = timedelta(minutes=30)
RESEND_COOLDOWN = timedelta(seconds=60)
MAX_ATTEMPTS = 5
SESSION_TTL = timedelta(days=30)
_fails: dict[str, list[float]] = {}     # спроби входу за останні 15 хв (простий захист від добору пароля)


# ───────── Допоміжні функції ─────────
def _h(value: str) -> str:
    return hmac.new(SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return f"scrypt${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str | None) -> bool:
    try:
        _, salt, dk = (stored or "").split("$")
        test = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=2**14, r=8, p=1, dklen=32)
        return hmac.compare_digest(test.hex(), dk)
    except ValueError:
        return False


def account_kind(email: str) -> AccountType:
    if email.endswith(CORP_DOMAIN):
        return AccountType.corporate
    if ALLOW_GUESTS:
        return AccountType.guest
    raise HTTPException(403, "Зараз реєстрація доступна лише з корпоративною поштою @ukma.edu.ua")


def issue_code(db: Session, email: str, purpose: str, bg: BackgroundTasks) -> None:
    now = datetime.utcnow()
    last = db.scalars(select(EmailCode).where(EmailCode.email == email, EmailCode.purpose == purpose)
                      .order_by(EmailCode.created_at.desc())).first()
    if last and now - last.created_at < RESEND_COOLDOWN:
        raise HTTPException(429, "Зачекайте хвилину перед повторним надсиланням коду")
    code = f"{secrets.randbelow(10**6):06d}"
    db.execute(delete(EmailCode).where(EmailCode.email == email, EmailCode.purpose == purpose))
    db.add(EmailCode(email=email, purpose=purpose, code_hash=_h(f"{email}:{purpose}:{code}"),
                     expires_at=now + CODE_TTL, created_at=now))
    db.commit()
    bg.add_task(emailer.send_code, email, code, purpose)


def check_code(db: Session, email: str, purpose: str, code: str) -> EmailCode:
    bad = HTTPException(400, "Невірний або прострочений код")
    row = db.scalars(select(EmailCode).where(EmailCode.email == email, EmailCode.purpose == purpose)).first()
    if not row or row.expires_at < datetime.utcnow() or row.attempts >= MAX_ATTEMPTS:
        raise bad
    row.attempts += 1
    if not hmac.compare_digest(row.code_hash, _h(f"{email}:{purpose}:{code}")):
        db.commit()
        raise bad
    return row


def create_session(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    db.add(AuthSession(token_hash=_h(token), user_id=user.id, expires_at=datetime.utcnow() + SESSION_TTL))
    db.commit()
    return token


def get_current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Потрібно увійти")
    sess = db.scalars(select(AuthSession).where(AuthSession.token_hash == _h(authorization[7:]))).first()
    if not sess or sess.expires_at < datetime.utcnow():
        raise HTTPException(401, "Сесія завершилась. Увійдіть знову")
    user = db.get(User, sess.user_id)
    want = UserRole.admin if user.email in ADMIN_EMAILS else UserRole.user   # ADMIN_EMAILS — єдине джерело правди
    if user.role != want:
        user.role = want
        db.commit()
    return user


def get_admin_user(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(403, "Потрібні права адміністратора")
    return user


# ───────── Схеми ─────────
class EmailIn(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def lower(cls, v: str) -> str:
        return v.lower()


class VerifyIn(EmailIn):
    code: str = Field(pattern=r"^\d{6}$")


def _phone(v: str) -> str:
    import re
    v = re.sub(r"[\s\-()]", "", v)
    if not PHONE_RE.match(v):
        raise ValueError("Номер має бути у форматі +380XXXXXXXXX")
    return v


class CompleteIn(EmailIn):
    verification_token: str
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=5, max_length=150)
    faculty_course: str = Field(min_length=2, max_length=50)
    phone: str

    _p = field_validator("phone")(_phone)


class LoginIn(EmailIn):
    password: str = Field(min_length=1, max_length=128)


class ResetConfirmIn(VerifyIn):
    new_password: str = Field(min_length=8, max_length=128)


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=5, max_length=150)
    faculty_course: str | None = Field(default=None, min_length=2, max_length=50)
    phone: str | None = None

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v):
        return _phone(v) if v is not None else v


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str
    faculty_course: str
    phone: str
    account_type: AccountType
    role: UserRole
    provider: str
    profile_complete: bool = False


class AuthOut(BaseModel):
    token: str
    user: UserOut


def user_out(u: User) -> UserOut:
    out = UserOut.model_validate(u)
    out.profile_complete = bool(u.full_name and u.faculty_course and u.phone)
    return out


# ───────── Реєстрація: пошта → код → дані й пароль ─────────
@router.get("/providers")
def providers():
    return {"microsoft": ms_configured(), "guests_allowed": ALLOW_GUESTS,
            "email_dev_mode": not emailer.smtp_configured()}


@router.post("/register/start", status_code=202)
def register_start(data: EmailIn, bg: BackgroundTasks, db: Session = Depends(get_db)):
    kind = account_kind(data.email)
    if db.scalar(select(User).where(User.email == data.email)):
        raise HTTPException(409, "Акаунт із такою поштою вже існує. Увійдіть")
    issue_code(db, data.email, "register", bg)
    return {"ok": True, "account_type": kind}


@router.post("/register/verify")
def register_verify(data: VerifyIn, db: Session = Depends(get_db)):
    row = check_code(db, data.email, "register", data.code)
    token = secrets.token_urlsafe(24)
    row.verified_token_hash = _h(token)
    row.attempts = MAX_ATTEMPTS                      # код більше не можна використати вдруге
    row.expires_at = datetime.utcnow() + VERIFIED_TTL
    db.commit()
    return {"verification_token": token}


@router.post("/register/complete", response_model=AuthOut, status_code=201)
def register_complete(data: CompleteIn, db: Session = Depends(get_db)):
    row = db.scalars(select(EmailCode).where(EmailCode.email == data.email, EmailCode.purpose == "register")).first()
    if (not row or not row.verified_token_hash or row.expires_at < datetime.utcnow()
            or not hmac.compare_digest(row.verified_token_hash, _h(data.verification_token))):
        raise HTTPException(400, "Підтвердження пошти застаріло. Почніть реєстрацію ще раз")
    if db.scalar(select(User).where(User.email == data.email)):
        raise HTTPException(409, "Акаунт із такою поштою вже існує. Увійдіть")
    user = User(email=data.email, password_hash=hash_password(data.password), full_name=data.full_name.strip(),
                faculty_course=data.faculty_course.strip(), phone=data.phone, account_type=account_kind(data.email),
                role=UserRole.admin if data.email in ADMIN_EMAILS else UserRole.user)
    db.add(user)
    db.execute(delete(EmailCode).where(EmailCode.email == data.email, EmailCode.purpose == "register"))
    db.commit()
    return AuthOut(token=create_session(db, user), user=user_out(user))


# ───────── Вхід (без листів) ─────────
@router.post("/login", response_model=AuthOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    now = time.time()
    recent = [t for t in _fails.get(data.email, []) if now - t < 900]
    if len(recent) >= 8:
        raise HTTPException(429, "Забагато невдалих спроб. Спробуйте через 15 хвилин")
    user = db.scalar(select(User).where(User.email == data.email))
    if not user or not verify_password(data.password, user.password_hash):
        _fails[data.email] = recent + [now]
        raise HTTPException(401, "Невірна пошта або пароль")
    _fails.pop(data.email, None)
    return AuthOut(token=create_session(db, user), user=user_out(user))


@router.post("/logout")
def logout(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    if authorization and authorization.startswith("Bearer "):
        db.execute(delete(AuthSession).where(AuthSession.token_hash == _h(authorization[7:])))
        db.commit()
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user_out(user)


@router.patch("/me", response_model=UserOut)
def update_me(data: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    return user_out(user)


# ───────── Скидання пароля ─────────
@router.post("/password-reset/start", status_code=202)
def reset_start(data: EmailIn, bg: BackgroundTasks, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == data.email)):    # відповідь однакова, щоб не розкривати, хто зареєстрований
        issue_code(db, data.email, "reset", bg)
    return {"ok": True}


@router.post("/password-reset/confirm")
def reset_confirm(data: ResetConfirmIn, db: Session = Depends(get_db)):
    row = check_code(db, data.email, "reset", data.code)
    user = db.scalar(select(User).where(User.email == data.email))
    if not user:
        raise HTTPException(400, "Невірний або прострочений код")
    user.password_hash = hash_password(data.new_password)
    db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))   # старі сесії скасовано
    db.delete(row)
    db.commit()
    return {"ok": True}


# ───────── Office 365 (Microsoft Entra ID) ─────────
def ms_configured() -> bool:
    return bool(MS_CLIENT_ID and MS_CLIENT_SECRET and MS_TENANT_ID)


def _sign(payload: dict) -> str:
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    return f"{body}.{_h(body)}"


def _unsign(token: str | None) -> dict | None:
    try:
        body, sig = (token or "").split(".")
        return json.loads(base64.urlsafe_b64decode(body)) if hmac.compare_digest(sig, _h(body)) else None
    except Exception:
        return None


def _claims(id_token: str) -> dict:
    part = id_token.split(".")[1]
    return json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4)))


@router.get("/microsoft/login")
def microsoft_login():
    if not ms_configured():
        raise HTTPException(503, "Вхід через Office 365 ще не налаштований")
    nonce = secrets.token_urlsafe(16)
    params = {"client_id": MS_CLIENT_ID, "response_type": "code", "response_mode": "query",
              "redirect_uri": f"{BACKEND_URL}/api/auth/microsoft/callback", "scope": "openid profile email",
              "state": _sign({"n": nonce, "exp": time.time() + 600}), "nonce": nonce, "prompt": "select_account"}
    return RedirectResponse(f"https://login.microsoftonline.com/{MS_TENANT_ID}/oauth2/v2.0/authorize?{urlencode(params)}")


@router.get("/microsoft/callback")
def microsoft_callback(code: str | None = None, state: str | None = None, error: str | None = None,
                       db: Session = Depends(get_db)):
    def fail(msg: str):
        return RedirectResponse(f"{FRONTEND_URL}/#/auth/callback?error={quote(msg)}")

    st = _unsign(state)
    if error:
        return fail("Вхід через Office 365 скасовано або заборонений")
    if not code or not st or st.get("exp", 0) < time.time():
        return fail("Сесія входу застаріла. Спробуйте ще раз")
    try:
        r = httpx.post(f"https://login.microsoftonline.com/{MS_TENANT_ID}/oauth2/v2.0/token", timeout=15, data={
            "client_id": MS_CLIENT_ID, "client_secret": MS_CLIENT_SECRET, "code": code,
            "grant_type": "authorization_code", "redirect_uri": f"{BACKEND_URL}/api/auth/microsoft/callback",
            "scope": "openid profile email"})
        if r.status_code != 200:
            return fail("Office 365 не підтвердив вхід. Спробуйте ще раз")
        # id_token отримано безпосередньо від Microsoft по TLS з client secret, тож підпис додатково не перевіряємо (OIDC Core §3.1.3.7)
        claims = _claims(r.json()["id_token"])
    except Exception:
        return fail("Не вдалося звʼязатися з Office 365")

    if (claims.get("aud") != MS_CLIENT_ID or claims.get("tid") != MS_TENANT_ID
            or claims.get("exp", 0) < time.time() or claims.get("nonce") != st["n"]):
        return fail("Вхід відхилено: акаунт не належить НаУКМА")
    email = (claims.get("preferred_username") or claims.get("email") or "").lower()
    if not email:
        return fail("Office 365 не передав пошту акаунта")

    user = db.scalar(select(User).where(User.email == email))
    if not user:
        user = User(email=email, full_name=claims.get("name", ""), provider="microsoft",
                    account_type=AccountType.corporate if email.endswith(CORP_DOMAIN) else AccountType.guest,
                    role=UserRole.admin if email in ADMIN_EMAILS else UserRole.user)
        db.add(user)
        db.commit()
    return RedirectResponse(f"{FRONTEND_URL}/#/auth/callback?token={create_session(db, user)}")
