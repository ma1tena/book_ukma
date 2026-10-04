"""book_ukma — FastAPI бекенд.  Запуск: uvicorn main:app --reload"""
import os
import secrets
from contextlib import asynccontextmanager
from datetime import date, datetime, time, timedelta

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user, router as auth_router
from database import Base, engine, get_db, migrate_sqlite
from models import Booking, BookingStatus, Building, Room, User, UserRole
from schemas import (AdminBookingOut, BookedSlot, BookingAdminUpdate,
                     BookingCreate, BookingOut, BuildingOut, RoomDetail, RoomOut)

# ---------- Налаштування ----------
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "dev-admin-token")   # ОБОВ'ЯЗКОВО змінити на проді
CORS_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]

OPEN_HOUR, CLOSE_HOUR = 8, 22        # години роботи КМЦ
MIN_DURATION = timedelta(minutes=30)
BLOCKING = (BookingStatus.pending, BookingStatus.approved)  # ці статуси займають слот


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    migrate_sqlite()
    yield


app = FastAPI(title="book_ukma API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",   # прев'ю та прод-домени Vercel
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)


app.include_router(auth_router)


# ---------- Допоміжні функції ----------
def require_admin(x_admin_token: str = Header(default="")):
    if not secrets.compare_digest(x_admin_token.encode(), ADMIN_TOKEN.encode()):
        raise HTTPException(401, "Потрібна авторизація адміністратора")


def find_conflict(db: Session, room_id: int, start: datetime, end: datetime,
                  exclude_id: int | None = None) -> Booking | None:
    """Два інтервали перетинаються, якщо start < чужий_end І end > чужий_start.
    Вплотну (кінець = початок іншого) — не перетин."""
    q = select(Booking).where(
        Booking.room_id == room_id,
        Booking.status.in_(BLOCKING),
        Booking.start_time < end,
        Booking.end_time > start,
    )
    if exclude_id is not None:
        q = q.where(Booking.id != exclude_id)
    return db.scalars(q).first()


def to_admin_out(b: Booking) -> AdminBookingOut:
    out = AdminBookingOut.model_validate(b)
    out.room_name = b.room.name
    out.building_name = b.room.building.name
    return out


# ---------- Публічні ендпоінти ----------
@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/buildings", response_model=list[BuildingOut])
def list_buildings(db: Session = Depends(get_db)):
    """Корпуси: активні (КМЦ) першими, інші — «Незабаром»."""
    return db.scalars(select(Building).order_by(Building.sort_order, Building.id)).all()


@app.get("/api/buildings/{building_id}/rooms", response_model=list[RoomOut])
def list_building_rooms(building_id: int, db: Session = Depends(get_db)):
    building = db.get(Building, building_id)
    if not building:
        raise HTTPException(404, "Корпус не знайдено")
    if not building.is_active:
        raise HTTPException(403, "Бронювання в цьому корпусі буде доступне незабаром")
    return db.scalars(
        select(Room).where(Room.building_id == building_id).order_by(Room.sort_order, Room.id)
    ).all()


@app.get("/api/rooms/{room_id}", response_model=RoomDetail)
def get_room(
    room_id: int,
    date_from: date | None = Query(None, description="Початок вікна календаря (за замовч. — сьогодні)"),
    date_to: date | None = Query(None, description="Кінець вікна (включно). За замовч. — без обмеження"),
    db: Session = Depends(get_db),
):
    room = db.scalars(
        select(Room).options(joinedload(Room.building)).where(Room.id == room_id)
    ).first()
    if not room:
        raise HTTPException(404, "Приміщення не знайдено")

    window_start = datetime.combine(date_from or date.today(), time.min)
    q = select(Booking).where(
        Booking.room_id == room_id,
        Booking.status.in_(BLOCKING),
        Booking.end_time > window_start,
    )
    if date_to:
        q = q.where(Booking.start_time < datetime.combine(date_to + timedelta(days=1), time.min))
    slots = db.scalars(q.order_by(Booking.start_time)).all()

    detail = RoomDetail.model_validate(room)
    detail.building_name = room.building.name
    detail.booked_slots = [BookedSlot.model_validate(s) for s in slots]
    return detail


@app.post("/api/bookings", response_model=BookingOut, status_code=201)
def create_booking(data: BookingCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    room = db.scalars(
        select(Room).options(joinedload(Room.building)).where(Room.id == data.room_id)
    ).first()
    if not room:
        raise HTTPException(404, "Приміщення не знайдено")
    if not room.building.is_active:
        raise HTTPException(403, "Бронювання в цьому корпусі поки недоступне")

    # --- бізнес-валідація ---
    if data.start_time < datetime.now():
        raise HTTPException(422, "Не можна бронювати час у минулому")
    if data.start_time.date() != data.end_time.date():
        raise HTTPException(422, "Подія має проходити в межах однієї доби")
    if data.end_time - data.start_time < MIN_DURATION:
        raise HTTPException(422, "Мінімальна тривалість — 30 хвилин")
    day = data.start_time.date()
    if data.start_time < datetime.combine(day, time(OPEN_HOUR)) or \
       data.end_time > datetime.combine(day, time(CLOSE_HOUR)):
        raise HTTPException(422, f"Бронювання можливе лише з {OPEN_HOUR}:00 до {CLOSE_HOUR}:00")
    if data.expected_participants > room.capacity:
        raise HTTPException(422, f"Вміщуваність «{room.name}» — до {room.capacity} осіб")

    equipment = list(dict.fromkeys(data.equipment))   # унікальні, зберігаючи порядок
    unknown = [e for e in equipment if e not in room.inventory]
    if unknown:
        raise HTTPException(422, f"Недоступна апаратура для «{room.name}»: {', '.join(unknown)}")

    # --- перевірка накладок ---
    if find_conflict(db, room.id, data.start_time, data.end_time):
        raise HTTPException(409, "Цей час уже зайнятий або очікує розгляду. Оберіть інше віконце")

    booking = Booking(
        **{**data.model_dump(), "equipment": equipment,
           "organizers": data.organizers.strip() or data.responsible_name,
           "contact_name": data.contact_name.strip() or data.responsible_name,
           "contact_phone": data.contact_phone or data.phone},
        email=user.email, user_id=user.id, status=BookingStatus.pending)
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@app.get("/api/bookings/mine", response_model=list[AdminBookingOut])
def my_bookings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Заявки поточного користувача (разом із коментарями адміністраторки)."""
    q = (select(Booking).options(joinedload(Booking.room).joinedload(Room.building))
         .where(Booking.user_id == user.id).order_by(Booking.created_at.desc()))
    return [to_admin_out(b) for b in db.scalars(q).all()]


@app.get("/api/bookings/{booking_id}", response_model=AdminBookingOut)
def get_booking(booking_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    b = db.scalars(select(Booking).options(joinedload(Booking.room).joinedload(Room.building))
                   .where(Booking.id == booking_id)).first()
    if not b or (b.user_id != user.id and user.role != UserRole.admin):
        raise HTTPException(404, "Заявку не знайдено")
    return to_admin_out(b)


# ---------- Адмін-ендпоінти ----------
@app.get("/api/admin/bookings", response_model=list[AdminBookingOut],
         dependencies=[Depends(require_admin)])
def admin_list_bookings(
    status: BookingStatus | None = Query(None),
    room_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    q = select(Booking).options(joinedload(Booking.room).joinedload(Room.building)).order_by(Booking.created_at.desc())
    if status:
        q = q.where(Booking.status == status)
    if room_id:
        q = q.where(Booking.room_id == room_id)
    return [to_admin_out(b) for b in db.scalars(q).all()]


@app.patch("/api/admin/bookings/{booking_id}", response_model=AdminBookingOut,
           dependencies=[Depends(require_admin)])
def admin_update_booking(booking_id: int, data: BookingAdminUpdate, db: Session = Depends(get_db)):
    booking = db.scalars(
        select(Booking).options(joinedload(Booking.room).joinedload(Room.building)).where(Booking.id == booking_id)
    ).first()
    if not booking:
        raise HTTPException(404, "Заявку не знайдено")

    # повторне схвалення раніше відхиленої заявки — перевіряємо, що час не зайняли за цей час
    if data.status in BLOCKING and find_conflict(
            db, booking.room_id, booking.start_time, booking.end_time, exclude_id=booking.id):
        raise HTTPException(409, "Цей час уже зайнятий іншою заявкою — схвалення неможливе")

    booking.status = data.status
    booking.admin_comment = (data.admin_comment or "").strip() or None
    db.commit()
    db.refresh(booking)
    return to_admin_out(booking)
