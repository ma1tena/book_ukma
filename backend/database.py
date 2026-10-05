"""Підключення до БД (SQLite + SQLAlchemy 2.0)."""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./book_ukma.db")

# check_same_thread=False потрібен для SQLite у FastAPI (багатопотоковість)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency для FastAPI (знадобиться в Milestone 2)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_sqlite() -> None:
    """Додає нові колонки до вже існуючих таблиць SQLite — без втрати даних і без --reset."""
    if not DATABASE_URL.startswith("sqlite"):
        return
    wanted = {"buildings": {
        "petition_recipient_title": "VARCHAR(150) DEFAULT ''",
        "petition_recipient_name": "VARCHAR(100) DEFAULT ''",
        "petition_approver": "VARCHAR(100) DEFAULT ''",
    }, "bookings": {
        "applicant_role": "VARCHAR(100) DEFAULT ''",
        "organizers": "VARCHAR(200) DEFAULT ''",
        "contact_name": "VARCHAR(150) DEFAULT ''",
        "contact_phone": "VARCHAR(20) DEFAULT ''",
        "user_id": "INTEGER",
    }}
    with engine.begin() as conn:
        for table, cols in wanted.items():
            have = {row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table})")}
            for name, ddl in cols.items():
                if have and name not in have:
                    conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")
        if "petition_approver" in {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(buildings)")}:
            conn.exec_driver_sql(                      # початкові дані подання для КМЦ (лише якщо порожні)
                "UPDATE buildings SET petition_recipient_title='Керівниці КМЦ НаУКМА', petition_recipient_name='Осьмак В. А.', "
                "petition_approver='Владислава ОСЬМАК' WHERE short_name='КМЦ' AND COALESCE(petition_recipient_title,'')=''")
