"""Адмін-ендпоінти для редагування змісту: корпуси та приміщення. Заявки — у main.py."""
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from auth import get_admin_user
from database import get_db
from models import Building, Room
from schemas import BuildingOut, RoomOut

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(get_admin_user)])

PHOTO_RE = re.compile(r"^(/[^\s]+|https://[^\s]+)$")     # власні файли сайту або https-посилання (не javascript: тощо)


class BuildingAdminOut(BuildingOut):
    petition_recipient_title: str = ""
    petition_recipient_name: str = ""
    petition_approver: str = ""
    rooms: list[RoomOut] = Field(default_factory=list)


class BuildingUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    is_active: bool | None = None
    petition_recipient_title: str | None = Field(default=None, max_length=150)
    petition_recipient_name: str | None = Field(default=None, max_length=100)
    petition_approver: str | None = Field(default=None, max_length=100)


class RoomFields(BaseModel):
    description: str | None = Field(default=None, max_length=1500)
    capacity: int | None = Field(default=None, ge=1, le=5000)
    capacity_text: str | None = Field(default=None, max_length=60)
    inventory: list[str] | None = None
    photos: list[str] | None = None

    @field_validator("capacity_text")
    @classmethod
    def blank_to_none(cls, v):
        return (v or "").strip() or None

    @field_validator("inventory")
    @classmethod
    def clean_inventory(cls, v):
        if v is None:
            return v
        items = list(dict.fromkeys(i.strip() for i in v if i and i.strip()))      # без порожніх і дублікатів
        if len(items) > 40 or any(len(i) > 80 for i in items):
            raise ValueError("Інвентар: до 40 позицій, кожна до 80 символів")
        return items

    @field_validator("photos")
    @classmethod
    def clean_photos(cls, v):
        if v is None:
            return v
        photos = list(dict.fromkeys(p.strip() for p in v if p and p.strip()))
        if len(photos) > 20 or any(len(p) > 500 or not PHOTO_RE.match(p) for p in photos):
            raise ValueError("Фото: до 20 шт.; адреса має починатися з «/» (файл сайту) або «https://»")
        return photos


class RoomUpdate(RoomFields):
    name: str | None = Field(default=None, min_length=2, max_length=120)


class RoomCreate(RoomFields):
    name: str = Field(min_length=2, max_length=120)
    capacity: int = Field(ge=1, le=5000)


def _apply(room: Room, data: BaseModel) -> None:
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None and field != "capacity_text":
            continue                                    # явний null не затирає обов'язкові поля
        setattr(room, field, value.strip() if isinstance(value, str) else value)
    room.photo_url = room.photos[0] if room.photos else ""          # обкладинка = перше фото


@router.get("/buildings", response_model=list[BuildingAdminOut])
def list_buildings(db: Session = Depends(get_db)):
    rows = db.scalars(select(Building).options(joinedload(Building.rooms)).order_by(Building.sort_order, Building.id)).unique().all()
    for b in rows:
        b.rooms.sort(key=lambda r: (r.sort_order, r.id))
    return rows


@router.patch("/buildings/{building_id}", response_model=BuildingAdminOut)
def update_building(building_id: int, data: BuildingUpdate, db: Session = Depends(get_db)):
    b = db.get(Building, building_id)
    if not b:
        raise HTTPException(404, "Корпус не знайдено")
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(b, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(b)
    b.rooms.sort(key=lambda r: (r.sort_order, r.id))
    return b


@router.patch("/rooms/{room_id}", response_model=RoomOut)
def update_room(room_id: int, data: RoomUpdate, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(404, "Приміщення не знайдено")
    _apply(room, data)
    db.commit()
    db.refresh(room)
    return room


@router.post("/buildings/{building_id}/rooms", response_model=RoomOut, status_code=201)
def create_room(building_id: int, data: RoomCreate, db: Session = Depends(get_db)):
    if not db.get(Building, building_id):
        raise HTTPException(404, "Корпус не знайдено")
    last = db.scalar(select(func.max(Room.sort_order)).where(Room.building_id == building_id)) or 0
    room = Room(building_id=building_id, name=data.name.strip(), capacity=data.capacity, sort_order=last + 1,
                description="", inventory=[], photos=[], photo_url="")
    _apply(room, data)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room
