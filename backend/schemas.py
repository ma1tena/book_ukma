"""Pydantic-схеми (валідація вхідних/вихідних даних)."""
import re
from datetime import datetime
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from models import BookingStatus

PHONE_RE = re.compile(r"^\+380\d{9}$")


# ---------- Building / Room ----------
class BuildingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    short_name: str
    description: str
    is_active: bool


class RoomOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    building_id: int
    name: str
    description: str
    capacity: int
    capacity_text: str | None = None
    photo_url: str
    photos: list[str] = Field(default_factory=list)
    inventory: list[str]


# ---------- Booking ----------
class BookingCreate(BaseModel):
    room_id: int
    start_time: datetime
    end_time: datetime
    responsible_name: str = Field(min_length=5, max_length=150)
    faculty_course: str = Field(min_length=2, max_length=50)
    phone: str
    applicant_role: str = Field(default="", max_length=100)
    organization: str = Field(default="", max_length=150)
    organizers: str = Field(default="", max_length=200)
    contact_name: str = Field(default="", max_length=150)
    contact_phone: str = ""
    event_name: str = Field(min_length=3, max_length=200)
    event_description: str = Field(default="", max_length=2000)
    expected_participants: int = Field(gt=0, le=1000)
    equipment: list[str] = Field(default_factory=list)

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        v = re.sub(r"[\s\-()]", "", v)
        if not PHONE_RE.match(v):
            raise ValueError("Номер має бути у форматі +380XXXXXXXXX")
        return v

    @field_validator("contact_phone")
    @classmethod
    def check_contact_phone(cls, v: str) -> str:
        if not v:
            return v
        v = re.sub(r"[\s\-()]", "", v)
        if not PHONE_RE.match(v):
            raise ValueError("Контактний номер має бути у форматі +380XXXXXXXXX")
        return v

    @field_validator("start_time", "end_time")
    @classmethod
    def to_kyiv_naive(cls, v: datetime) -> datetime:
        """Якщо клієнт надіслав час із поясом (напр. ...Z), переводимо в київський без tz."""
        if v.tzinfo is not None:
            v = v.astimezone(ZoneInfo("Europe/Kyiv")).replace(tzinfo=None)
        return v

    @model_validator(mode="after")
    def check_times(self):
        if self.end_time <= self.start_time:
            raise ValueError("Час завершення має бути пізніше за початок")
        return self


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    room_id: int
    start_time: datetime
    end_time: datetime
    responsible_name: str
    faculty_course: str
    email: str
    phone: str
    organization: str
    event_name: str
    event_description: str
    expected_participants: int
    equipment: list[str]
    status: BookingStatus
    admin_comment: str | None
    created_at: datetime
    applicant_role: str = ""
    organizers: str = ""
    contact_name: str = ""
    contact_phone: str = ""
    user_id: int | None = None


class BookedSlot(BaseModel):
    """Публічний (знеособлений) зайнятий слот для календаря."""
    model_config = ConfigDict(from_attributes=True)
    start_time: datetime
    end_time: datetime
    status: BookingStatus


class BookingAdminUpdate(BaseModel):
    status: BookingStatus
    admin_comment: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def comment_required_on_reject(self):
        if self.status == BookingStatus.rejected and not (self.admin_comment or "").strip():
            raise ValueError("Вкажіть причину відхилення або що змінити для погодження")
        return self


class RoomDetail(RoomOut):
    """Деталі кімнати + зайняті слоти для календаря."""
    building_name: str = ""
    booked_slots: list[BookedSlot] = Field(default_factory=list)


class AdminBookingOut(BookingOut):
    room_name: str = ""
    building_name: str = ""
    recipient_title: str = ""   # дані подання беруться з корпусу
    recipient_name: str = ""
    approver_name: str = ""
