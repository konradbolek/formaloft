"""Cennik w bazie i plik, z którego liczy kalkulator Node."""

from __future__ import annotations

import json
import os
from pathlib import Path

from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from stilowo_desk.models import RateCardRecord
from stilowo_desk.store import stamp_now

MONEY = (
    "frame2",
    "frame3",
    "frame4",
    "finishM2",
    "laborBase",
    "laborMeter",
    "bar1",
    "bar2",
    "railLaborBase",
    "railLaborPiece",
)

DEFAULT_RATES = {
    "frame2": 22,
    "frame3": 32,
    "frame4": 46,
    "finishM2": 80,
    "laborBase": 200,
    "laborMeter": 17,
    "woods": {"sosna": 190, "buk": 310, "jesion": 450, "dab": 520, "orzech": 760},
    "bar1": 8,
    "bar2": 18,
    "railLaborBase": 280,
    "railLaborPiece": 12,
}


def rates_file() -> Path:
    configured = os.environ.get("STILOWO_RATES_FILE", "").strip()
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[3] / "server" / "data" / "rates.json"


class WoodRates(BaseModel):
    sosna: int
    buk: int
    jesion: int
    dab: int
    orzech: int

    @field_validator("*")
    @classmethod
    def money(cls, value: int) -> int:
        return _money(value)


class RateCard(BaseModel):
    frame2: int
    frame3: int
    frame4: int
    finishM2: int
    laborBase: int
    laborMeter: int
    woods: WoodRates
    bar1: int
    bar2: int
    railLaborBase: int
    railLaborPiece: int

    @field_validator(*MONEY)
    @classmethod
    def money(cls, value: int) -> int:
        return _money(value)


class RateView(BaseModel):
    rates: RateCard
    defaults: RateCard
    updatedAt: str = ""


def _money(value: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0 or value > 20000:
        raise ValueError("Stawka ma być liczbą od 0 do 20 000 zł.")
    return value


def default_card() -> RateCard:
    return RateCard.model_validate(DEFAULT_RATES)


def read_card(session: Session) -> RateView:
    row = session.get(RateCardRecord, 1)
    if row is None or not row.payload:
        card = default_card()
        _store(session, card, row.updated_at if row else "")
        row = session.get(RateCardRecord, 1)
    else:
        card = RateCard.model_validate_json(row.payload)
    _write_file(card)
    return RateView(rates=card, defaults=default_card(), updatedAt=row.updated_at if row else "")


def save_card(session: Session, card: RateCard) -> RateView:
    _store(session, card, stamp_now())
    _write_file(card)
    row = session.get(RateCardRecord, 1)
    return RateView(rates=card, defaults=default_card(), updatedAt=row.updated_at if row else "")


def _store(session: Session, card: RateCard, updated_at: str) -> None:
    payload = card.model_dump_json()
    row = session.get(RateCardRecord, 1)
    if row is None:
        session.add(RateCardRecord(id=1, payload=payload, updated_at=updated_at))
    else:
        row.payload = payload
        if updated_at:
            row.updated_at = updated_at
    session.commit()


def _write_file(card: RateCard) -> None:
    path = rates_file()
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(card.model_dump(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)
