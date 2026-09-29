"""Ініціалізація БД і первинне наповнення.

Запуск:  python init_db.py          (створити + наповнити, якщо порожньо)
         python init_db.py --reset  (видалити все й створити заново)
"""
import sys
from datetime import datetime, timedelta

from database import Base, SessionLocal, engine
from models import Booking, BookingStatus, Building, Room


def seed(db):
    # ---- Корпуси: КМЦ активний і першим ----
    kmc = Building(
        name="Культурно-мистецький центр (КМЦ)", short_name="КМЦ",
        description="Простір для подій, виставок, концертів і зустрічей студентської спільноти.",
        is_active=True, sort_order=0,
    )
    coming_soon = [
        ("Корпус 1", "К1"), ("Корпус 2", "К2"), ("Корпус 5", "К5"), ("Корпус 7", "К7"),
    ]
    others = [
        Building(name=n, short_name=s, description="", is_active=False, sort_order=10 + i)
        for i, (n, s) in enumerate(coming_soon)
    ]
    db.add_all([kmc, *others])
    db.flush()

    # ---- Приміщення КМЦ ----
    rooms = [
        Room(
            building_id=kmc.id, name="Підwall", capacity=60, sort_order=1,
            description="Камерний простір біля скеледрому — для лекцій, кіноперегляду, зустрічей СО.",
            photo_url="https://picsum.photos/seed/podwall/800/500",
            inventory=["Проєктор", "Екран", "Мікрофон", "Колонки", "Стільці", "Столи"],
        ),
        Room(
            building_id=kmc.id, name="Колізей", capacity=150, sort_order=2,
            description="Відкритий амфітеатр-зал для великих подій, презентацій і виступів.",
            photo_url="https://picsum.photos/seed/colosseum/800/500",
            inventory=["Проєктор", "Екран", "Мікрофони (2 шт.)", "Звукова система",
                       "Мікшерний пульт", "Сценічне світло", "Стільці"],
        ),
        Room(
            building_id=kmc.id, name="Актова зала", capacity=300, sort_order=3,
            description="Головна зала КМЦ зі сценою — для концертів, конференцій, урочистостей.",
            photo_url="https://picsum.photos/seed/aktova/800/500",
            inventory=["Сцена", "Проєктор", "Великий екран", "Мікрофони (4 шт.)",
                       "Звукова система", "Мікшерний пульт", "Сценічне світло",
                       "Трибуна", "Фортепіано"],
        ),
        Room(
            building_id=kmc.id, name="Білий простір", capacity=40, sort_order=4,
            description="Мінімалістична світла зала для виставок, воркшопів і творчих практик.",
            photo_url="https://picsum.photos/seed/whitespace/800/500",
            inventory=["Проєктор", "Виставкові стенди", "Столи", "Стільці", "Wi-Fi"],
        ),
    ]
    db.add_all(rooms)
    db.flush()

    # ---- Тестові заявки (для перевірки календаря в наступних майлстонах) ----
    tomorrow = (datetime.now() + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    colosseum = rooms[1]
    db.add_all([
        Booking(
            room_id=colosseum.id, start_time=tomorrow.replace(hour=14),
            end_time=tomorrow.replace(hour=17), responsible_name="Коваленко О. І.",
            faculty_course="ФСНСТ-3", email="o.kovalenko@ukma.edu.ua", phone="+380501112233",
            organization="СО «Радіо КВІТ»", event_name="Ефір-зустріч першокурсників",
            event_description="Відкрита зустріч і прямий ефір.", expected_participants=80,
            equipment=["Мікрофони (2 шт.)", "Звукова система"], status=BookingStatus.approved,
        ),
        Booking(
            room_id=colosseum.id, start_time=tomorrow.replace(hour=18),
            end_time=tomorrow.replace(hour=20), responsible_name="Шевченко М. П.",
            faculty_course="ФГН-2", email="m.shevchenko@ukma.edu.ua", phone="+380671234567",
            organization="СО «Кіноклуб»", event_name="Кіновечір",
            event_description="Перегляд і обговорення фільму.", expected_participants=50,
            equipment=["Проєктор", "Екран"], status=BookingStatus.pending,
        ),
    ])
    db.commit()


def main():
    if "--reset" in sys.argv:
        Base.metadata.drop_all(engine)
        print("🗑  Таблиці видалено")
    Base.metadata.create_all(engine)

    with SessionLocal() as db:
        if db.query(Building).count() == 0:
            seed(db)
            print("✅ БД створено й наповнено тестовими даними")
        else:
            print("ℹ️  БД уже містить дані (використайте --reset для перезапису)")

        print("\nКорпуси:")
        for b in db.query(Building).order_by(Building.sort_order):
            print(f"  [{'активний' if b.is_active else 'Незабаром'}] {b.name}")
        print("\nПриміщення КМЦ:")
        for r in db.query(Room).order_by(Room.sort_order):
            print(f"  • {r.name} (до {r.capacity} осіб): {', '.join(r.inventory)}")
        print(f"\nЗаявок у БД: {db.query(Booking).count()}")


if __name__ == "__main__":
    main()
