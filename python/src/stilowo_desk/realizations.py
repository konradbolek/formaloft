"""Realizacje na stronie. Wycena ze statusem odebrana nie publikuje się sama."""

from __future__ import annotations

import io
import re
import secrets
from pathlib import Path
from typing import Optional

from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from stilowo_desk.models import RealizationRecord
from stilowo_desk.store import note_text, one_line, stamp_now

REALIZATION_ID = re.compile(r"^RZ-[A-Z0-9]{5,12}$")
CALCULATOR_PATH = re.compile(r"^/kalkulator/[a-z0-9-]{1,80}$")
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
PHOTO_LIMIT = 8_000_000


class RealizationError(ValueError):
    pass


class RealizationWrite(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: Optional[str] = None
    kicker: Optional[str] = None
    summary: Optional[str] = None
    body: Optional[str] = None
    price_label: Optional[str] = Field(default=None, alias="priceLabel")
    image: Optional[str] = None
    alt: Optional[str] = None
    calculator_path: Optional[str] = Field(default=None, alias="calculatorPath")
    published: Optional[bool] = None
    sort: Optional[int] = None


def present(row: RealizationRecord) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "kicker": row.kicker,
        "summary": row.summary,
        "body": row.body,
        "priceLabel": row.price_label,
        "image": row.image,
        "alt": row.alt,
        "calculatorPath": row.calculator_path,
        "published": bool(row.published),
        "sort": row.sort,
    }


def listed(session: Session, published_only: bool) -> list[dict]:
    query = select(RealizationRecord).order_by(RealizationRecord.sort, RealizationRecord.title)
    if published_only:
        query = query.where(RealizationRecord.published.is_(True))
    return [present(row) for row in session.scalars(query)]


def create_realization(session: Session, title: str) -> RealizationRecord:
    cleaned = one_line(title, 120)
    if not cleaned:
        raise RealizationError("Wpisz tytuł.")
    taken = set(session.scalars(select(RealizationRecord.id)))
    highest = session.scalar(select(RealizationRecord.sort).order_by(RealizationRecord.sort.desc()))
    row = RealizationRecord(
        id=_fresh_id(taken),
        title=cleaned,
        published=False,
        sort=0 if highest is None else int(highest) + 1,
        updated_at=stamp_now(),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def update_realization(session: Session, realization_id: str, changes: RealizationWrite) -> Optional[RealizationRecord]:
    row = session.get(RealizationRecord, realization_id)
    if row is None or not REALIZATION_ID.fullmatch(realization_id):
        return None
    data = changes.model_dump(exclude_unset=True)
    if not data:
        raise RealizationError("Nie ma czego zapisać.")
    if "title" in data:
        row.title = _title(data["title"])
    if "kicker" in data:
        row.kicker = one_line(data["kicker"], 80)
    if "summary" in data:
        row.summary = one_line(data["summary"], 400)
    if "body" in data:
        row.body = note_text(data["body"])
    if "price_label" in data:
        row.price_label = one_line(data["price_label"], 40)
    if "image" in data:
        row.image = _image_path(data["image"])
    if "alt" in data:
        row.alt = one_line(data["alt"], 200)
    if "calculator_path" in data:
        row.calculator_path = _calculator_path(data["calculator_path"])
    if "published" in data:
        if not isinstance(data["published"], bool):
            raise RealizationError("Pokaż na stronie: tak albo nie.")
        row.published = data["published"]
    if "sort" in data:
        row.sort = _sort(data["sort"])
    row.updated_at = stamp_now()
    session.commit()
    session.refresh(row)
    return row


def delete_realization(session: Session, uploads: Path, realization_id: str) -> bool:
    row = session.get(RealizationRecord, realization_id)
    if row is None or not REALIZATION_ID.fullmatch(realization_id):
        return False
    session.delete(row)
    session.commit()
    path = photo_file(uploads, realization_id)
    if path.is_file():
        path.unlink()
    return True


def save_photo(session: Session, uploads: Path, realization_id: str, raw: bytes) -> RealizationRecord:
    row = session.get(RealizationRecord, realization_id)
    if row is None or not REALIZATION_ID.fullmatch(realization_id):
        raise RealizationError("Nie ma takiej realizacji.")
    if len(raw) > PHOTO_LIMIT:
        raise RealizationError("Zdjęcie może mieć najwyżej 8 MB.")
    try:
        image = Image.open(io.BytesIO(raw))
        image = image.convert("RGB")
    except (UnidentifiedImageError, OSError) as error:
        raise RealizationError("To zdjęcie nie da się odczytać.") from error
    image.thumbnail((2400, 2400))
    path = photo_file(uploads, realization_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "JPEG", quality=85)
    row.image = f"/desk/api/realizations/{realization_id}/photo"
    if not row.alt:
        row.alt = row.title
    row.updated_at = stamp_now()
    session.commit()
    session.refresh(row)
    return row


def photo_file(uploads: Path, realization_id: str) -> Path:
    if not REALIZATION_ID.fullmatch(realization_id):
        raise RealizationError("Nie ma takiej realizacji.")
    folder = (uploads / "realizacje").resolve()
    path = (folder / f"{realization_id}.jpg").resolve()
    if path.parent != folder:
        raise RealizationError("Nie ma takiej realizacji.")
    return path


def _fresh_id(taken: set[str]) -> str:
    for _ in range(20):
        candidate = "RZ-" + "".join(secrets.choice(ALPHABET) for _ in range(5))
        if candidate not in taken:
            return candidate
    raise RealizationError("Nie udało się nadać numeru.")


def _title(value: object) -> str:
    text = one_line(value, 120)
    if not text:
        raise RealizationError("Wpisz tytuł.")
    return text


def _image_path(value: object) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if not text.startswith("/") or ".." in text or "\\" in text or "://" in text:
        raise RealizationError("Zdjęcie ma być plikiem z tej strony.")
    return text[:200]


def _calculator_path(value: object) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if not CALCULATOR_PATH.fullmatch(text):
        raise RealizationError("Link ma prowadzić do kalkulatora.")
    return text


def _sort(value: object) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not 0 <= value <= 999:
        raise RealizationError("Kolejność ma być liczbą od 0 do 999.")
    return value
