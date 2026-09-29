"""Pydantic-схеми (валідація вхідних/вихідних даних)."""
import re
from datetime import datetime

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
    photo_url: str
    inventory: list[str]


# ---------- Booking ----------
class BookingCreate(BaseModel):
    room_id: int
    start_time: datetime
    end_time: datetime
    responsible_name: str = Field(min_length=5, max_length=150)
    faculty_course: str = Field(min_length=2, max_length=50)
    email: EmailStr
    phone: str
    organization: str = Field(default="", max_length=150)
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

    @field_validator("email")
    @classmethod
    def check_email_domain(cls, v: str) -> str:
        if not v.lower().endswith("@ukma.edu.ua"):
            raise ValueError("Потрібна пошта НаУКМА (@ukma.edu.ua)")
        return v.lower()

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
