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
