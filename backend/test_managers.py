"""Адміністратори приміщень: бачать і вирішують лише закріплене за ними."""
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import auth
import emailer
import init_db
from database import Base, get_db
from main import app
from models import User, UserRole


def _user(email, name, **kw):
    return User(email=email, full_name=name, faculty_course="ФІ-2", phone="+380501112233", **kw)


@pytest.fixture()
def env(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False)
    with Session() as db:
        init_db.seed(db)
        users = [_user("admin@ukma.edu.ua", "Адмін Тест Іванівна"),
                 _user("mgr@ukma.edu.ua", "Менеджер Тест Іванівна"),
                 _user("student@ukma.edu.ua", "Студент Тест Іванович")]
        db.add_all(users); db.commit()
        monkeypatch.setattr(auth, "ADMIN_EMAILS", {"admin@ukma.edu.ua"})
        tokens = [auth.create_session(db, u) for u in users]

    def override():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    emailer.OUTBOX.clear()
    clients = []
    for t in tokens:
        c = TestClient(app); c.headers["Authorization"] = f"Bearer {t}"; clients.append(c)
    yield clients
    app.dependency_overrides.clear()


def rooms(adm):
    return adm.get("/api/admin/buildings").json()[0]["rooms"]


def book(stu, room_id, hour):
    d = (datetime.now() + timedelta(days=3)).replace(hour=hour, minute=0, second=0, microsecond=0)
    r = stu.post("/api/bookings", json={
        "room_id": room_id, "start_time": d.isoformat(), "end_time": (d + timedelta(hours=1)).isoformat(),
        "responsible_name": "Студент Тест Іванович", "faculty_course": "ФІ-2", "phone": "+380501112233",
        "event_name": f"Захід {room_id}", "expected_participants": 10, "equipment": []})
    assert r.status_code == 201, r.text
    return r.json()


def assign(adm, ids, email="mgr@ukma.edu.ua"):
    return adm.put("/api/admin/managers", json={"email": email, "room_ids": ids})


def test_manager_sees_only_own_rooms(env):
    adm, mgr, stu = env
    r1, r2 = rooms(adm)[:2]
    b1, b2 = book(stu, r1["id"], 10), book(stu, r2["id"], 12)
    assert mgr.get("/api/admin/bookings").status_code == 403          # ще не призначено
    assert assign(adm, [r1["id"]]).status_code == 200
    me = mgr.get("/api/auth/me").json()
    assert me["role"] == "manager"
    ids = [b["id"] for b in mgr.get("/api/admin/bookings").json()]
    assert ids == [b1["id"]]
    assert mgr.get(f"/api/bookings/{b2['id']}").status_code == 404
    assert [r["id"] for r in rooms(mgr)] == [r1["id"]]


def test_manager_decides_only_own(env):
    adm, mgr, stu = env
    r1, r2 = rooms(adm)[:2]
    b1, b2 = book(stu, r1["id"], 10), book(stu, r2["id"], 12)
    assign(adm, [r1["id"]])
    assert mgr.patch(f"/api/admin/bookings/{b2['id']}", json={"status": "approved"}).status_code == 404
    assert mgr.patch(f"/api/admin/bookings/{b1['id']}", json={"status": "approved"}).status_code == 200


def test_manager_edits_only_own_rooms_and_no_structure(env):
    adm, mgr, _stu = env
    r1, r2 = rooms(adm)[:2]
    assign(adm, [r1["id"]])
    assert mgr.patch(f"/api/admin/rooms/{r1['id']}", json={"description": "Новий"}).status_code == 200
    assert mgr.patch(f"/api/admin/rooms/{r2['id']}", json={"description": "Злам"}).status_code == 404
    assert mgr.patch("/api/admin/buildings/1", json={"name": "Злам"}).status_code == 403
    assert mgr.post("/api/admin/buildings/1/rooms", json={"name": "Нова", "capacity": 5}).status_code == 403
    assert mgr.get("/api/admin/managers").status_code == 403
    assert mgr.put("/api/admin/managers", json={"email": "x@ukma.edu.ua", "room_ids": [1]}).status_code == 403


def test_new_booking_mails_only_responsible_managers(env):
    adm, mgr, stu = env
    r1, r2 = rooms(adm)[:2]
    assign(adm, [r1["id"]])
    emailer.OUTBOX.clear()
    book(stu, r2["id"], 10)
    to = {m["to"] for m in emailer.OUTBOX if m.get("kind") == "new_booking"}
    assert to == {"admin@ukma.edu.ua"}
    emailer.OUTBOX.clear()
    book(stu, r1["id"], 12)
    to = {m["to"] for m in emailer.OUTBOX if m.get("kind") == "new_booking"}
    assert to == {"admin@ukma.edu.ua", "mgr@ukma.edu.ua"}


def test_revoke_and_validation(env):
    adm, mgr, stu = env
    r1 = rooms(adm)[0]
    assert assign(adm, [r1["id"]]).status_code == 200
    assert adm.get("/api/admin/managers").json()[0]["room_ids"] == [r1["id"]]
    assert assign(adm, [9999]).status_code == 422
    assert assign(adm, []).status_code == 200                           # доступ знято
    assert mgr.get("/api/admin/bookings").status_code == 403
    assert mgr.get("/api/auth/me").json()["role"] == "user"
    assert stu.put("/api/admin/managers", json={"email": "a@ukma.edu.ua", "room_ids": []}).status_code == 403


def test_grant_works_before_registration(env):
    adm, *_ = env
    r = assign(adm, [rooms(adm)[0]["id"]], email="New.Person@ukma.edu.ua")
    assert r.status_code == 200 and r.json()["email"] == "new.person@ukma.edu.ua"
