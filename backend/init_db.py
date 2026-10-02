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
        name="Культурно-мистецький центр", short_name="КМЦ",
        description="Культурно-мистецький центр НаУКМА — простір для лекцій, вистав, кінопереглядів та заходів.",
        is_active=True, sort_order=0,
    )
    kinds = {1: "Історичний корпус Мазепи", 4: "Бібліотечний корпус", 6: "Адміністративний корпус"}
    others = [
        Building(name=f"Корпус {n}", short_name=f"К{n}", description=kinds.get(n, "Навчальний корпус"),
                 is_active=False, sort_order=10 + n)
        for n in range(1, 11)
    ]
    db.add_all([kmc, *others])
    db.flush()

    # ---- Приміщення КМЦ ----
    rooms = [
        Room(
            building_id=kmc.id, name="Підwall", capacity=200, capacity_text="до 150 - 200 осіб", sort_order=1,
            description="Камерний простір в укритті КМЦ — для лекцій, квартирників, вечірок, зустрічей СО.",
            photos=[f"/images/rooms/podwall/{n}.jpg" for n in (1, 2, 3)],   # додайте/приберіть номери
            photo_url=f"/images/rooms/podwall/1.jpg",
            inventory=["Мікрофони (2 шт.)", "Колонки", "Мікшерний пульт", "Телевізор", "Стільці", "Столи"],
        ),
        Room(
            building_id=kmc.id, name="Колізей", capacity=200, sort_order=2,
            description="Відкритий амфітеатр-зал для великих подій, презентацій і виступів.",
            photos=[f"/images/rooms/colosseum/{n}.jpg" for n in (1, 2, 3)],   # додайте/приберіть номери
            photo_url=f"/images/rooms/colosseum/1.jpg",
            inventory=["Проєктор", "Екран", "Мікрофони (2 шт.)", "Звукова система", "Мікшерний пульт", "Телевізор"],
        ),
        Room(
            building_id=kmc.id, name="Актова зала", capacity=600, sort_order=3,
            description="Головна зала КМЦ зі сценою — для концертів, конференцій, урочистостей.",
            photos=[f"/images/rooms/aktova/{n}.jpg" for n in (1, 2, 3)],   # додайте/приберіть номери
            photo_url=f"/images/rooms/aktova/1.jpg",
            inventory=["Сцена", "Проєктор", "Великий екран", "Мікрофони (4 шт.)", "Звукова система",
                       "Мікшерний пульт", "Сценічне світло", "Трибуна", "Фортепіано", "Колонки"],
        ),
        Room(
            building_id=kmc.id, name="Білий простір", capacity=30, sort_order=4,
            description="Мінімалістична світла зала для виставок, воркшопів і творчих практик.",
            photos=[f"/images/rooms/white-space/{n}.jpg" for n in (1, 2, 3)],   # додайте/приберіть номери
            photo_url=f"/images/rooms/white-space/1.jpg",
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
            print(f"  • {r.name} ({r.capacity_text or 'до ' + str(r.capacity) + ' осіб'}): {', '.join(r.inventory)}")
        print(f"\nЗаявок у БД: {db.query(Booking).count()}")


if __name__ == "__main__":
    main()
