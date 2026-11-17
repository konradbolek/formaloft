"""Widok kolejki dla panelu: skrót pulpitu, wyceny i wiadomości."""

from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from stilowo_desk.describe import summarize_piece
from stilowo_desk.models import MessageRecord, QuoteRecord
from stilowo_desk.store import message_records, raw_quotes, records, sync_from_files, sync_messages
from stilowo_desk.summary import PRODUCT_LABELS, known_status, summarize


def _lines(raw: dict) -> list[dict]:
    price = raw.get("price") if isinstance(raw.get("price"), dict) else {}
    lines = price.get("lines") if isinstance(price.get("lines"), list) else []
    cleaned = []
    for line in lines:
        if not isinstance(line, dict):
            continue
        cleaned.append(
            {
                "label": line.get("label") or "",
                "detail": line.get("detail") or "",
                "amount": line.get("amount") or 0,
            }
        )
    return cleaned


def _media(raw: dict, key: str):
    value = raw.get(key)
    if not isinstance(value, dict) or not value.get("url"):
        return None
    if key == "photo":
        return {"url": value["url"], "originalName": value.get("originalName") or ""}
    return {"url": value["url"]}


def present_quote(row: QuoteRecord, raw: dict) -> dict:
    product = row.product or "stojak"
    return {
        "id": row.id,
        "createdAt": row.created_at,
        "updatedAt": row.updated_at or row.created_at,
        "product": product,
        "productName": PRODUCT_LABELS.get(product, PRODUCT_LABELS["stojak"]),
        "summary": summarize_piece(raw) if raw else "",
        "price": {"total": row.total, "currency": row.currency or "PLN", "lines": _lines(raw)},
        "preview": _media(raw, "preview"),
        "photo": _media(raw, "photo"),
        "status": known_status(row.status),
        "clientName": row.client_name,
        "clientPhone": row.client_phone,
        "note": row.note,
    }


def present_message(row: MessageRecord) -> dict:
    return {
        "id": row.id,
        "createdAt": row.created_at,
        "updatedAt": row.updated_at or row.created_at,
        "name": row.name,
        "email": row.email,
        "phone": row.phone,
        "message": row.message,
        "handled": bool(row.handled),
        "note": row.note,
    }


def workshop_desk(session: Session, quotes_dir: Path, messages_dir: Path) -> dict:
    sync_from_files(session, quotes_dir)
    sync_messages(session, messages_dir)
    files = raw_quotes(quotes_dir)
    quote_rows = records(session)
    return {
        "dashboard": summarize([row.as_quote() for row in quote_rows]).model_dump(),
        "quotes": [present_quote(row, files.get(row.id, {})) for row in quote_rows],
        "messages": [present_message(row) for row in message_records(session)],
    }
