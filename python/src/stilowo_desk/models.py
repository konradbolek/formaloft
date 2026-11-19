"""Wycena zapisana w bazie pulpitu."""

from __future__ import annotations

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from stilowo_desk.db import Base
from stilowo_desk.quotes import Price, Quote


class QuoteRecord(Base):
    __tablename__ = "quotes"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    created_at: Mapped[str] = mapped_column(String(40), default="")
    updated_at: Mapped[str] = mapped_column(String(40), default="")
    product: Mapped[str] = mapped_column(String(40), default="stojak")
    status: Mapped[str] = mapped_column(String(20), default="nowa")
    total: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(8), default="PLN")
    client_name: Mapped[str] = mapped_column(String(200), default="")
    client_phone: Mapped[str] = mapped_column(String(40), default="")
    note: Mapped[str] = mapped_column(Text, default="")

    def as_quote(self) -> Quote:
        return Quote(
            id=self.id,
            createdAt=self.created_at,
            updatedAt=self.updated_at,
            product=self.product,
            status=self.status,
            price=Price(total=self.total, currency=self.currency or "PLN"),
            clientName=self.client_name,
        )


class MessageRecord(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    created_at: Mapped[str] = mapped_column(String(40), default="")
    updated_at: Mapped[str] = mapped_column(String(40), default="")
    name: Mapped[str] = mapped_column(String(200), default="")
    email: Mapped[str] = mapped_column(String(200), default="")
    phone: Mapped[str] = mapped_column(String(40), default="")
    message: Mapped[str] = mapped_column(Text, default="")
    handled: Mapped[bool] = mapped_column(Boolean, default=False)
    note: Mapped[str] = mapped_column(Text, default="")


class RealizationRecord(Base):
    __tablename__ = "realizations"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    title: Mapped[str] = mapped_column(String(120), default="")
    kicker: Mapped[str] = mapped_column(String(80), default="")
    summary: Mapped[str] = mapped_column(String(400), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    price_label: Mapped[str] = mapped_column(String(40), default="")
    image: Mapped[str] = mapped_column(String(200), default="")
    alt: Mapped[str] = mapped_column(String(200), default="")
    calculator_path: Mapped[str] = mapped_column(String(120), default="")
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    sort: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[str] = mapped_column(String(40), default="")


class RateCardRecord(Base):
    __tablename__ = "rate_card"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    payload: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[str] = mapped_column(String(40), default="")
