from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import auth
import init_db
from database import Base, get_db
from models import User
from main import app

ADMIN = {"X-Admin-Token": "dev-admin-token"}


@pytest.fixture()
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                           poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False)
    with Session() as db:
        init_db.seed(db)
        ua = User(email="student@ukma.edu.ua", full_name="Студент Тест Іванович", faculty_course="ФІ-2", phone="+380501112233")
        ub = User(email="other@ukma.edu.ua", full_name="Інша Особа Петрівна", faculty_course="ФГН-1", phone="+380671112233")
        db.add_all([ua, ub])
        db.commit()
        tok_a, tok_b = auth.create_session(db, ua), auth.create_session(db, ub)

    def override():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    c = TestClient(app)
    c.headers["Authorization"] = f"Bearer {tok_a}"
    c.token_b = tok_b
    yield c
    app.dependency_overrides.clear()


def tomorrow(h, m=0):
    d = datetime.now() + timedelta(days=1)
    return d.replace(hour=h, minute=m, second=0, microsecond=0)


def payload(room_id, start, end, **kw):
    base = dict(
        room_id=room_id, start_time=start.isoformat(), end_time=end.isoformat(),
        responsible_name="Петренко П. П.", faculty_course="ФІ-2",
        phone="+380 66 123 45 67",
        organization="СО «Тест»", event_name="Тестова подія",
        expected_participants=20, equipment=["Проєктор"],
    )
    base.update(kw)
    return base


def colosseum_id(client):
    building = client.get("/api/buildings").json()[0]
    rooms = client.get(f"/api/buildings/{building['id']}/rooms").json()
    return next(r["id"] for r in rooms if r["name"] == "Колізей")


def test_buildings_kmc_first_and_others_locked(client):
    data = client.get("/api/buildings").json()
    assert data[0]["short_name"] == "КМЦ" and data[0]["is_active"] is True
    assert all(not b["is_active"] for b in data[1:])


def test_locked_building_rooms_forbidden(client):
    locked = client.get("/api/buildings").json()[1]
    assert client.get(f"/api/buildings/{locked['id']}/rooms").status_code == 403


def test_room_detail_has_booked_slots(client):
    rid = colosseum_id(client)
    r = client.get(f"/api/rooms/{rid}").json()
    assert r["building_name"].startswith("Культурно")
    assert len(r["booked_slots"]) == 2 and "Проєктор" in r["inventory"]
    assert "email" not in r["booked_slots"][0]          # персональні дані не світяться


def test_room_not_found(client):
    assert client.get("/api/rooms/9999").status_code == 404


def test_create_booking_ok_and_phone_normalized(client):
    rid = colosseum_id(client)
    r = client.post("/api/bookings", json=payload(rid, tomorrow(10), tomorrow(12)))
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "pending" and body["phone"] == "+380661234567"


def test_overlap_rejected_and_adjacent_allowed(client):
    rid = colosseum_id(client)
    # у seed: 14–17 (approved) і 18–20 (pending)
    assert client.post("/api/bookings", json=payload(rid, tomorrow(16), tomorrow(18))).status_code == 409
    assert client.post("/api/bookings", json=payload(rid, tomorrow(18, 30), tomorrow(19))).status_code == 409
    assert client.post("/api/bookings", json=payload(rid, tomorrow(17), tomorrow(18))).status_code == 201


def test_business_validation(client):
    rid = colosseum_id(client)
    too_many = payload(rid, tomorrow(9), tomorrow(10), expected_participants=500)
    assert client.post("/api/bookings", json=too_many).status_code == 422
    bad_eq = payload(rid, tomorrow(9), tomorrow(10), equipment=["Фортепіано"])
    assert client.post("/api/bookings", json=bad_eq).status_code == 422
    night = payload(rid, tomorrow(23), tomorrow(23, 45))
    assert client.post("/api/bookings", json=night).status_code == 422
    past = payload(rid, datetime.now() - timedelta(days=1), datetime.now() - timedelta(hours=20))
    assert client.post("/api/bookings", json=past).status_code == 422


def test_admin_requires_token(client):
    assert client.get("/api/admin/bookings").status_code == 401
    assert client.get("/api/admin/bookings", headers={"X-Admin-Token": "wrong"}).status_code == 401


def test_admin_list_filter_and_update(client):
    items = client.get("/api/admin/bookings", headers=ADMIN).json()
    assert len(items) == 2 and items[0]["room_name"] == "Колізей"
    pending = client.get("/api/admin/bookings?status=pending", headers=ADMIN).json()
    assert len(pending) == 1

    bid = pending[0]["id"]
    r = client.patch(f"/api/admin/bookings/{bid}", headers=ADMIN, json={"status": "approved"})
    assert r.status_code == 200 and r.json()["status"] == "approved"


def test_reject_needs_comment(client):
    bid = client.get("/api/admin/bookings?status=pending", headers=ADMIN).json()[0]["id"]
    assert client.patch(f"/api/admin/bookings/{bid}", headers=ADMIN,
                        json={"status": "rejected"}).status_code == 422
    r = client.patch(f"/api/admin/bookings/{bid}", headers=ADMIN,
                     json={"status": "rejected", "admin_comment": "Оберіть інший час"})
    assert r.status_code == 200 and r.json()["admin_comment"] == "Оберіть інший час"


def test_rejected_frees_slot_and_reapprove_conflicts(client):
    rid = colosseum_id(client)
    bid = client.get("/api/admin/bookings?status=pending", headers=ADMIN).json()[0]["id"]
    client.patch(f"/api/admin/bookings/{bid}", headers=ADMIN,
                 json={"status": "rejected", "admin_comment": "Конфлікт з іншим заходом"})
    # слот 18–20 звільнився
    assert client.post("/api/bookings", json=payload(rid, tomorrow(18), tomorrow(19))).status_code == 201
    # повторно схвалити стару заявку вже не можна
    r = client.patch(f"/api/admin/bookings/{bid}", headers=ADMIN, json={"status": "approved"})
    assert r.status_code == 409


def test_cors_allows_vercel(client):
    r = client.options("/api/buildings", headers={
        "Origin": "https://book-ukma.vercel.app",
        "Access-Control-Request-Method": "GET"})
    assert r.headers.get("access-control-allow-origin") == "https://book-ukma.vercel.app"


# ───────── Заявки під акаунтом ─────────
def test_booking_requires_login(client):
    rid = colosseum_id(client)
    anon = TestClient(app)
    assert anon.post("/api/bookings", json=payload(rid, tomorrow(10), tomorrow(11))).status_code == 401
    assert anon.get("/api/bookings/mine").status_code == 401


def test_booking_is_attached_to_account(client):
    rid = colosseum_id(client)
    b = client.post("/api/bookings", json=payload(rid, tomorrow(10), tomorrow(11))).json()
    assert b["email"] == "student@ukma.edu.ua" and b["user_id"] is not None
    assert b["organizers"] == "Петренко П. П." and b["contact_phone"] == b["phone"]   # значення за замовчуванням


def test_my_bookings_are_private(client):
    rid = colosseum_id(client)
    created = client.post("/api/bookings", json=payload(rid, tomorrow(10), tomorrow(11),
                          applicant_role="Секретарка", contact_name="Іваненко Ірина")).json()
    mine = client.get("/api/bookings/mine").json()
    assert len(mine) == 1 and mine[0]["room_name"] == "Колізей" and mine[0]["building_name"].startswith("Культурно")
    assert mine[0]["applicant_role"] == "Секретарка" and mine[0]["contact_name"] == "Іваненко Ірина"

    other = {"Authorization": f"Bearer {client.token_b}"}
    assert client.get("/api/bookings/mine", headers=other).json() == []
    assert client.get(f"/api/bookings/{created['id']}", headers=other).status_code == 404   # чужу заявку не видно
    assert client.get(f"/api/bookings/{created['id']}").status_code == 200
