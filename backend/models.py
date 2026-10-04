"""ORM-моделі: Building, Room, Booking."""
import enum
from datetime import datetime

from sqlalchemy import (JSON, Boolean, CheckConstraint, DateTime, Enum,
                        ForeignKey, Index, Integer, String, Text)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class BookingStatus(str, enum.Enum):
    pending = "pending"      # На розгляді
    approved = "approved"    # Підтверджено
    rejected = "rejected"    # Відхилено


class Building(Base):
    __tablename__ = "buildings"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    short_name: Mapped[str] = mapped_column(String(30))
    description: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)   # False => «Незабаром»
    sort_order: Mapped[int] = mapped_column(Integer, default=100)     # КМЦ = 0 (зверху)

    rooms: Mapped[list["Room"]] = relationship(
        back_populates="building", cascade="all, delete-orphan"
    )


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    capacity: Mapped[int] = mapped_column(Integer)                       # максимум — для перевірки заявок
    capacity_text: Mapped[str | None] = mapped_column(String(60), nullable=True)  # напис на сайті, напр. «до 150 - 200 осіб»
    photo_url: Mapped[str] = mapped_column(String(500), default="")      # обкладинка (перше фото)
    photos: Mapped[list[str]] = mapped_column(JSON, default=list)        # усі фото для галереї
    inventory: Mapped[list[str]] = mapped_column(JSON, default=list)  # ["Проєктор", ...]
    sort_order: Mapped[int] = mapped_column(Integer, default=100)

    building: Mapped["Building"] = relationship(back_populates="rooms")
    bookings: Mapped[list["Booking"]] = relationship(
        back_populates="room", cascade="all, delete-orphan"
    )

    __table_args__ = (CheckConstraint("capacity > 0", name="ck_room_capacity_positive"),)


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), index=True)

    # Часовий слот (локальний київський час, без tz)
    start_time: Mapped[datetime] = mapped_column(DateTime)
    end_time: Mapped[datetime] = mapped_column(DateTime)

    # Дані з квіз-форми / «Подання»
    responsible_name: Mapped[str] = mapped_column(String(150))    # Прізвище І. Б.
    faculty_course: Mapped[str] = mapped_column(String(50))       # напр. ФСНСТ-3
    email: Mapped[str] = mapped_column(String(150))                # пошта НаУКМА
    phone: Mapped[str] = mapped_column(String(20))                 # +380XXXXXXXXX
    organization: Mapped[str] = mapped_column(String(150), default="")  # назва СО
    event_name: Mapped[str] = mapped_column(String(200))
    event_description: Mapped[str] = mapped_column(Text, default="")
    expected_participants: Mapped[int] = mapped_column(Integer)
    equipment: Mapped[list[str]] = mapped_column(JSON, default=list)   # обрана апаратура
    applicant_role: Mapped[str] = mapped_column(String(100), default="")   # посада в СО (для подання)
    organizers: Mapped[str] = mapped_column(String(200), default="")
    contact_name: Mapped[str] = mapped_column(String(150), default="")
    contact_phone: Mapped[str] = mapped_column(String(20), default="")
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)

    # Обробка адміністраторкою
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus), default=BookingStatus.pending, index=True
    )
    admin_comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    room: Mapped["Room"] = relationship(back_populates="bookings")

    __table_args__ = (
        CheckConstraint("end_time > start_time", name="ck_booking_time_order"),
        CheckConstraint("expected_participants > 0", name="ck_booking_participants"),
        Index("ix_booking_room_time", "room_id", "start_time", "end_time"),
    )


# ───────────────────────── Автентифікація ─────────────────────────
class AccountType(str, enum.Enum):
    corporate = "corporate"   # пошта @ukma.edu.ua
    guest = "guest"           # будь-яка інша пошта (режим «гість»)


class UserRole(str, enum.Enum):
    user = "user"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(200), nullable=True)  # None — вхід лише через Office 365
    full_name: Mapped[str] = mapped_column(String(150), default="")
    faculty_course: Mapped[str] = mapped_column(String(50), default="")
    phone: Mapped[str] = mapped_column(String(20), default="")
    account_type: Mapped[AccountType] = mapped_column(Enum(AccountType), default=AccountType.corporate)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.user)
    provider: Mapped[str] = mapped_column(String(20), default="local")             # local | microsoft
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmailCode(Base):
    """Одноразовий код із листа (реєстрація або скидання пароля). Зберігається лише хеш."""
    __tablename__ = "email_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(150), index=True)
    purpose: Mapped[str] = mapped_column(String(20))                  # register | reset
    code_hash: Mapped[str] = mapped_column(String(64))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    verified_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
