import base64
import json
import time
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import auth
import emailer
from database import Base, get_db
from main import app

EMAIL = "o.kovalenko@ukma.edu.ua"
PROFILE = dict(full_name="Коваленко Олена Іванівна", faculty_course="ФСНСТ-3", phone="+380 50 111 22 33")


@pytest.fixture()
def client(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False)

    def override():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    monkeypatch.setattr(auth, "RESEND_COOLDOWN", timedelta(0))   # окремий тест перевіряє ліміт
    auth._fails.clear()
    emailer.OUTBOX.clear()
    yield TestClient(app)
    app.dependency_overrides.clear()


def last_code():
    return emailer.OUTBOX[-1]["code"]


def register(client, email=EMAIL, password="Secret123!"):
    assert client.post("/api/auth/register/start", json={"email": email}).status_code == 202
    v = client.post("/api/auth/register/verify", json={"email": email, "code": last_code()})
    assert v.status_code == 200
    return client.post("/api/auth/register/complete", json={
        "email": email, "verification_token": v.json()["verification_token"], "password": password, **PROFILE})


def test_providers_defaults(client):
    p = client.get("/api/auth/providers").json()
    assert p["microsoft"] is False and p["guests_allowed"] is False and p["email_dev_mode"] is True


def test_full_registration_then_login_without_email(client):
    r = register(client)
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["account_type"] == "corporate" and body["user"]["profile_complete"] is True
    assert body["user"]["phone"] == "+380501112233"
    auth_h = {"Authorization": f"Bearer {body['token']}"}
    assert client.get("/api/auth/me", headers=auth_h).json()["email"] == EMAIL

    client.post("/api/auth/logout", headers=auth_h)
    assert client.get("/api/auth/me", headers=auth_h).status_code == 401

    n = len(emailer.OUTBOX)
    ok = client.post("/api/auth/login", json={"email": EMAIL, "password": "Secret123!"})
    assert ok.status_code == 200 and len(emailer.OUTBOX) == n          # лист при вході НЕ надсилається
    assert client.post("/api/auth/login", json={"email": EMAIL, "password": "wrong"}).status_code == 401


def test_non_corporate_email_blocked_until_guests_enabled(client, monkeypatch):
    assert client.post("/api/auth/register/start", json={"email": "someone@gmail.com"}).status_code == 403
    monkeypatch.setattr(auth, "ALLOW_GUESTS", True)
    r = register(client, email="someone@gmail.com")
    assert r.status_code == 201 and r.json()["user"]["account_type"] == "guest"


def test_duplicate_registration(client):
    register(client)
    assert client.post("/api/auth/register/start", json={"email": EMAIL}).status_code == 409


def test_wrong_code_and_lockout_after_5_attempts(client):
    client.post("/api/auth/register/start", json={"email": EMAIL})
    real = last_code()
    wrong = "000000" if real != "000000" else "111111"
    for _ in range(5):
        assert client.post("/api/auth/register/verify", json={"email": EMAIL, "code": wrong}).status_code == 400
    assert client.post("/api/auth/register/verify", json={"email": EMAIL, "code": real}).status_code == 400


def test_complete_requires_verified_token_and_strong_password(client):
    client.post("/api/auth/register/start", json={"email": EMAIL})
    body = {"email": EMAIL, "verification_token": "fake", "password": "Secret123!", **PROFILE}
    assert client.post("/api/auth/register/complete", json=body).status_code == 400
    v = client.post("/api/auth/register/verify", json={"email": EMAIL, "code": last_code()}).json()
    short = {**body, "verification_token": v["verification_token"], "password": "123"}
    assert client.post("/api/auth/register/complete", json=short).status_code == 422
    bad_phone = {**body, "verification_token": v["verification_token"], "phone": "12345"}
    assert client.post("/api/auth/register/complete", json=bad_phone).status_code == 422


def test_resend_cooldown(client, monkeypatch):
    monkeypatch.setattr(auth, "RESEND_COOLDOWN", timedelta(seconds=60))
    assert client.post("/api/auth/register/start", json={"email": EMAIL}).status_code == 202
    assert client.post("/api/auth/register/start", json={"email": EMAIL}).status_code == 429


def test_login_rate_limit(client):
    register(client)
    for _ in range(8):
        client.post("/api/auth/login", json={"email": EMAIL, "password": "nope"})
    assert client.post("/api/auth/login", json={"email": EMAIL, "password": "Secret123!"}).status_code == 429


def test_password_reset_flow(client):
    old = register(client).json()["token"]
    # невідомий email — та сама відповідь, але лист не надсилається
    n = len(emailer.OUTBOX)
    assert client.post("/api/auth/password-reset/start", json={"email": "nobody@ukma.edu.ua"}).status_code == 202
    assert len(emailer.OUTBOX) == n

    assert client.post("/api/auth/password-reset/start", json={"email": EMAIL}).status_code == 202
    r = client.post("/api/auth/password-reset/confirm", json={"email": EMAIL, "code": last_code(), "new_password": "NewSecret456"})
    assert r.status_code == 200
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {old}"}).status_code == 401   # старі сесії скасовано
    assert client.post("/api/auth/login", json={"email": EMAIL, "password": "NewSecret456"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": EMAIL, "password": "Secret123!"}).status_code == 401


def test_profile_update(client):
    tok = register(client).json()["token"]
    h = {"Authorization": f"Bearer {tok}"}
    r = client.patch("/api/auth/me", headers=h, json={"faculty_course": "ФІ-2"})
    assert r.status_code == 200 and r.json()["faculty_course"] == "ФІ-2"
    assert client.patch("/api/auth/me", headers=h, json={"phone": "bad"}).status_code == 422


def test_admin_email_gets_admin_role(client, monkeypatch):
    monkeypatch.setattr(auth, "ADMIN_EMAILS", {EMAIL})
    assert register(client).json()["user"]["role"] == "admin"


# ───────── Office 365 ─────────
def test_microsoft_not_configured(client):
    assert client.get("/api/auth/microsoft/login", follow_redirects=False).status_code == 503


def _fake_id_token(**claims):
    payload = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
    return f"h.{payload}.s"


@pytest.fixture()
def ms(client, monkeypatch):
    monkeypatch.setattr(auth, "MS_CLIENT_ID", "client-1")
    monkeypatch.setattr(auth, "MS_CLIENT_SECRET", "secret")
    monkeypatch.setattr(auth, "MS_TENANT_ID", "tenant-ukma")
    return client


def _callback(client, monkeypatch, **claims_override):
    loc = client.get("/api/auth/microsoft/login", follow_redirects=False).headers["location"]
    assert "tenant-ukma/oauth2/v2.0/authorize" in loc
    from urllib.parse import parse_qs, urlparse
    q = parse_qs(urlparse(loc).query)
    claims = dict(aud="client-1", tid="tenant-ukma", exp=time.time() + 600, nonce=q["nonce"][0],
                  preferred_username="Student@ukma.edu.ua", name="Студент Тест")
    claims.update(claims_override)

    class Resp:
        status_code = 200
        def json(self): return {"id_token": _fake_id_token(**claims)}

    monkeypatch.setattr(auth.httpx, "post", lambda *a, **k: Resp())
    return client.get("/api/auth/microsoft/callback", params={"code": "abc", "state": q["state"][0]}, follow_redirects=False)


def test_microsoft_login_creates_corporate_user(ms, monkeypatch):
    assert ms.get("/api/auth/providers").json()["microsoft"] is True
    r = _callback(ms, monkeypatch)
    assert r.status_code in (302, 307) and "#/auth/callback?token=" in r.headers["location"]
    token = r.headers["location"].split("token=")[1]
    me = ms.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).json()
    assert me["email"] == "student@ukma.edu.ua" and me["provider"] == "microsoft"
    assert me["account_type"] == "corporate" and me["profile_complete"] is False


def test_microsoft_rejects_foreign_tenant_and_bad_nonce(ms, monkeypatch):
    assert "error=" in _callback(ms, monkeypatch, tid="other-tenant").headers["location"]
    assert "error=" in _callback(ms, monkeypatch, nonce="forged").headers["location"]
    assert "error=" in ms.get("/api/auth/microsoft/callback", params={"code": "x", "state": "garbage"}, follow_redirects=False).headers["location"]


# ───────── Роль адміністратора за ADMIN_EMAILS ─────────
def test_admin_role_follows_admin_emails(client, monkeypatch):
    tok = register(client).json()["token"]
    h = {"Authorization": f"Bearer {tok}"}
    assert client.get("/api/auth/me", headers=h).json()["role"] == "user"
    monkeypatch.setattr(auth, "ADMIN_EMAILS", {EMAIL})                  # додали пошту в налаштування — роль з'являється без перереєстрації
    assert client.get("/api/auth/me", headers=h).json()["role"] == "admin"
    monkeypatch.setattr(auth, "ADMIN_EMAILS", set())                    # прибрали — права знімаються
    assert client.get("/api/auth/me", headers=h).json()["role"] == "user"
