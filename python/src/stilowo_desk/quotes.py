"""Odczyt wycen zapisanych przez kalkulator Node jako pliki JSON."""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field


class Price(BaseModel):
    model_config = ConfigDict(extra="ignore")

    total: int = 0
    currency: str = "PLN"


class Quote(BaseModel):
    """Jedna wycena. Pola, których pulpit nie używa, są pomijane."""

    model_config = ConfigDict(extra="ignore")

    id: str
    createdAt: str = ""
    product: str = "stojak"
    status: str = "nowa"
    price: Price = Field(default_factory=Price)
    clientName: str = ""


def load_quotes(directory: Path) -> list[Quote]:
    """Czyta katalog wycen. Brak katalogu daje pustą listę. Uszkodzony plik jest pomijany."""

    if not directory.is_dir():
        return []

    quotes: list[Quote] = []
    for path in directory.glob("*.json"):
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
            quotes.append(Quote.model_validate(raw))
        except (OSError, json.JSONDecodeError, ValueError):
            continue

    quotes.sort(key=lambda quote: quote.createdAt, reverse=True)
    return quotes
