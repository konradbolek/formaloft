"""Połączenie z bazą pulpitu. Domyślnie lokalny PostgreSQL, w testach SQLite."""

from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DEFAULT_URL = "postgresql+psycopg://stilowo:stilowo@127.0.0.1:5432/stilowo"

ENGINE = None
SessionLocal = None


class Base(DeclarativeBase):
    pass


def database_url() -> str:
    return os.environ.get("STILOWO_DATABASE_URL", "").strip() or DEFAULT_URL


def configure() -> None:
    global ENGINE, SessionLocal
    url = database_url()
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    ENGINE = create_engine(url, connect_args=connect_args)
    SessionLocal = sessionmaker(bind=ENGINE, autoflush=False, expire_on_commit=False)


def get_session():
    if SessionLocal is None:
        configure()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def upgrade_database() -> None:
    from alembic import command
    from alembic.config import Config

    ini = Path(__file__).resolve().parents[2] / "alembic.ini"
    cfg = Config(str(ini))
    cfg.set_main_option("sqlalchemy.url", database_url().replace("%", "%%"))
    command.upgrade(cfg, "head")
