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


@pytest.fixture()
def env(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False)
    with Session() as db:
        init_db.seed(db)
        admin = User(email="admin@ukma.edu.ua", full_name="Адмін Тест Іванівна", role=UserRole.admin)
        stud = User(email="student@ukma.edu.ua", full_name="Студент Тест Іванович", faculty_course="ФІ-2", phone="+380501112233")
        db.add_all([admin, stud]); db.commit()
        ta, ts = auth.create_session(db, admin), auth.create_session(db, stud)

    def override():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    monkeypatch.setattr(auth, "ADMIN_EMAILS", {"admin@ukma.edu.ua"})
    emailer.OUTBOX.clear()
    adm, stu = TestClient(app), TestClient(app)
    adm.headers["Authorization"] = f"Bearer {ta}"
    stu.headers["Authorization"] = f"Bearer {ts}"
    yield adm, stu
    app.dependency_overrides.clear()


def first_room(adm):
    b = adm.get("/api/admin/buildings").json()[0]
    return b, b["rooms"][0]


def test_buildings_with_rooms_and_petition_data(env):
    adm, _ = env
    data = adm.get("/api/admin/buildings").json()
    kmc = data[0]
    assert kmc["short_name"] == "КМЦ" and len(kmc["rooms"]) == 4 and kmc["petition_approver"] == "Владислава ОСЬМАК"
    assert len(data) == 11


def test_update_building(env):
    adm, _ = env
    b, _r = first_room(adm)
    r = adm.patch(f"/api/admin/buildings/{b['id']}", json={"description": "Новий опис", "petition_recipient_name": "Іваненко І. І.", "name": None})
    assert r.status_code == 200 and r.json()["description"] == "Новий опис"
    assert r.json()["petition_recipient_name"] == "Іваненко І. І." and r.json()["name"] == b["name"]   # null не затирає назву
    # корпус «Незабаром» можна відкрити
    soon = adm.get("/api/admin/buildings").json()[1]
    assert soon["is_active"] is False
    assert adm.patch(f"/api/admin/buildings/{soon['id']}", json={"is_active": True}).json()["is_active"] is True


def test_update_room_cleans_inventory_and_syncs_cover(env):
    adm, _ = env
    _b, room = first_room(adm)
    r = adm.patch(f"/api/admin/rooms/{room['id']}", json={
        "inventory": ["  Проєктор ", "Екран", "Проєктор", ""], "capacity": 120, "capacity_text": "   ",
        "photos": ["/images/rooms/a/1.jpg", "https://example.com/x.jpg"]})
    assert r.status_code == 200
    body = r.json()
    assert body["inventory"] == ["Проєктор", "Екран"] and body["capacity"] == 120 and body["capacity_text"] is None
    assert body["photo_url"] == "/images/rooms/a/1.jpg"
    # публічний ендпоінт бачить зміни
    assert adm.get(f"/api/rooms/{room['id']}").json()["inventory"] == ["Проєктор", "Екран"]


@pytest.mark.parametrize("bad", ["javascript:alert(1)", "http://insecure.com/a.jpg", "photo.jpg", "data:image/png;base64,AAA"])
def test_room_rejects_unsafe_photo_urls(env, bad):
    adm, _ = env
    _b, room = first_room(adm)
    assert adm.patch(f"/api/admin/rooms/{room['id']}", json={"photos": [bad]}).status_code == 422


def test_room_validation(env):
    adm, _ = env
    _b, room = first_room(adm)
    assert adm.patch(f"/api/admin/rooms/{room['id']}", json={"capacity": 0}).status_code == 422
    assert adm.patch("/api/admin/rooms/9999", json={"name": "Тест"}).status_code == 404


def test_create_room(env):
    adm, _ = env
    b, _r = first_room(adm)
    r = adm.post(f"/api/admin/buildings/{b['id']}/rooms", json={"name": " Нова зала ", "capacity": 50, "inventory": ["Стільці"]})
    assert r.status_code == 201 and r.json()["name"] == "Нова зала" and r.json()["inventory"] == ["Стільці"]
    assert any(x["name"] == "Нова зала" for x in adm.get(f"/api/buildings/{b['id']}/rooms").json())
    assert adm.post("/api/admin/buildings/9999/rooms", json={"name": "Зала", "capacity": 10}).status_code == 404


def test_students_cannot_edit_content(env):
    _, stu = env
    assert stu.patch("/api/admin/rooms/1", json={"name": "Злам"}).status_code == 403
    assert stu.patch("/api/admin/buildings/1", json={"name": "Злам"}).status_code == 403
    assert stu.post("/api/admin/buildings/1/rooms", json={"name": "Злам", "capacity": 5}).status_code == 403


# ───────── Листи про заявки ─────────
def _book(stu, adm, hour=10):
    _b, room = first_room(adm)
    d = (datetime.now() + timedelta(days=3)).replace(hour=hour, minute=0, second=0, microsecond=0)
    r = stu.post("/api/bookings", json={
        "room_id": room["id"], "start_time": d.isoformat(), "end_time": (d + timedelta(hours=1)).isoformat(),
        "responsible_name": "Студент Тест Іванович", "faculty_course": "ФІ-2", "phone": "+380501112233",
        "event_name": "Тестовий захід", "expected_participants": 10, "equipment": []})
    assert r.status_code == 201
    return r.json()


def test_new_booking_notifies_admins(env):
    adm, stu = env
    _book(stu, adm)
    mails = [m for m in emailer.OUTBOX if m.get("kind") == "new_booking"]
    assert len(mails) == 1 and mails[0]["to"] == "admin@ukma.edu.ua" and "Тестовий захід" in mails[0]["body"]


def test_decision_notifies_applicant_once(env):
    adm, stu = env
    b = _book(stu, adm)
    emailer.OUTBOX.clear()
    r = adm.patch(f"/api/admin/bookings/{b['id']}", json={"status": "approved", "admin_comment": "Принесіть ключі"})
    assert r.status_code == 200
    mail = emailer.OUTBOX[-1]
    assert mail["to"] == "student@ukma.edu.ua" and "підтверджено" in mail["subject"] and "Принесіть ключі" in mail["body"]
    n = len(emailer.OUTBOX)
    adm.patch(f"/api/admin/bookings/{b['id']}", json={"status": "approved", "admin_comment": "ще раз"})   # без зміни статусу — без листа
    assert len(emailer.OUTBOX) == n


def test_rejection_needs_comment_and_applicant_sees_it(env):
    adm, stu = env
    b = _book(stu, adm)
    assert adm.patch(f"/api/admin/bookings/{b['id']}", json={"status": "rejected"}).status_code == 422
    adm.patch(f"/api/admin/bookings/{b['id']}", json={"status": "rejected", "admin_comment": "Оберіть інший день"})
    mine = stu.get("/api/bookings/mine").json()[0]
    assert mine["status"] == "rejected" and mine["admin_comment"] == "Оберіть інший день"
    assert mine["approver_name"] == "Владислава ОСЬМАК" and mine["recipient_title"] == "Керівниці КМЦ НаУКМА"
    assert "відхилено" in emailer.OUTBOX[-1]["subject"]
