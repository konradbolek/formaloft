"""Cennik w bazie i plik, z którego liczy kalkulator Node."""

from __future__ import annotations

import json
import os
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, field_validator
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

DEFAULT_STEEL = {
    "15": {"frame2": 17, "frame3": 24, "frame4": 35},
    "20": {"frame2": 22, "frame3": 32, "frame4": 46},
    "30": {"frame2": 33, "frame3": 48, "frame4": 69},
}
DEFAULT_LABOR = {"stojak": 200, "polka": 200, "regal": 200, "barierka": 280}

DEFAULT_RATES = {
    "frame2": 22,
    "frame3": 32,
    "frame4": 46,
    "steel": DEFAULT_STEEL,
    "finishM2": 80,
    "laborBase": 200,
    "laborMeter": 17,
    "labor": DEFAULT_LABOR,
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


class ProfileRates(BaseModel):
    frame2: int
    frame3: int
    frame4: int

    @field_validator("*")
    @classmethod
    def money(cls, value: int) -> int:
        return _money(value)


class SteelRates(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    w15: ProfileRates = Field(alias="15")
    w20: ProfileRates = Field(alias="20")
    w30: ProfileRates = Field(alias="30")

class LaborRates(BaseModel):
    stojak: int
    polka: int
    regal: int
    barierka: int

    @field_validator("*")
    @classmethod
    def money(cls, value: int) -> int:
        return _money(value)


class RateCard(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    frame2: int
    frame3: int
    frame4: int
    steel: SteelRates
    finishM2: int
    laborBase: int
    laborMeter: int
    labor: LaborRates
    woods: WoodRates
    bar1: int
    bar2: int
    railLaborBase: int
    railLaborPiece: int

    @field_validator(*MONEY)
    @classmethod
    def money(cls, value: int) -> int:
        return _money(value)


def normalize_rates(raw: dict) -> dict:
    data = dict(raw or {})
    incoming = data.get("steel") if isinstance(data.get("steel"), dict) else {}
    steel = {}
    for wall, fallback in DEFAULT_STEEL.items():
        row = incoming.get(wall) if isinstance(incoming.get(wall), dict) else {}
        filled = dict(row)
        for key, value in fallback.items():
            if key not in filled:
                filled[key] = data[key] if wall == "20" and key in data else value
        steel[wall] = filled
    data["steel"] = steel
    for key in ("frame2", "frame3", "frame4"):
        data.setdefault(key, steel["20"][key])
    incoming_labor = data.get("labor") if isinstance(data.get("labor"), dict) else {}
    labor = dict(incoming_labor)
    labor.setdefault("stojak", data.get("laborBase", DEFAULT_LABOR["stojak"]))
    labor.setdefault("polka", data.get("laborBase", DEFAULT_LABOR["polka"]))
    labor.setdefault("regal", data.get("laborBase", DEFAULT_LABOR["regal"]))
    labor.setdefault("barierka", data.get("railLaborBase", DEFAULT_LABOR["barierka"]))
    data["labor"] = labor
    data.setdefault("laborBase", labor["stojak"])
    data.setdefault("railLaborBase", labor["barierka"])
    return data


def card_from(raw: dict) -> RateCard:
    return RateCard.model_validate(normalize_rates(raw))


class RateView(BaseModel):
    rates: RateCard
    defaults: RateCard
    updatedAt: str = ""


def _money(value: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0 or value > 20000:
        raise ValueError("Stawka ma być liczbą od 0 do 20 000 zł.")
    return value


def default_card() -> RateCard:
    return card_from(DEFAULT_RATES)


def read_card(session: Session) -> RateView:
    row = session.get(RateCardRecord, 1)
    if row is None or not row.payload:
        card = default_card()
        _store(session, card, row.updated_at if row else "")
        row = session.get(RateCardRecord, 1)
    else:
        card = card_from(json.loads(row.payload))
    _write_file(card)
    return RateView(rates=card, defaults=default_card(), updatedAt=row.updated_at if row else "")


def save_card(session: Session, card: RateCard) -> RateView:
    _store(session, card, stamp_now())
    _write_file(card)
    row = session.get(RateCardRecord, 1)
    return RateView(rates=card, defaults=default_card(), updatedAt=row.updated_at if row else "")


def _payload(card: RateCard) -> dict:
    return card.model_dump(by_alias=True)


def _store(session: Session, card: RateCard, updated_at: str) -> None:
    payload = json.dumps(_payload(card), ensure_ascii=False)
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
    temporary.write_text(json.dumps(_payload(card), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)
