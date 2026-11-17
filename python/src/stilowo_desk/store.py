"""Zapis warsztatu w bazie i lustrzane odbicie w plikach kalkulatora."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from stilowo_desk.models import MessageRecord, QuoteRecord
from stilowo_desk.quotes import load_quotes
from stilowo_desk.summary import STATUSES, known_status

QUOTE_ID = re.compile(r"^FL-[A-HJ-NP-Z2-9]{5}$")
MESSAGE_ID = re.compile(r"^WK-[A-HJ-NP-Z2-9]{5}$")


class StatusError(ValueError):
    pass


def one_line(value: object, limit: int) -> str:
    return " ".join(str(value or "").split())[:limit]


def note_text(value: object) -> str:
    text = str(value or "").replace("\r\n", "\n")
    text = re.sub(r"[^\S\n]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:2000]


def stamp_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def records(session: Session) -> list[QuoteRecord]:
    return list(session.scalars(select(QuoteRecord).order_by(QuoteRecord.created_at.desc())))


def message_records(session: Session) -> list[MessageRecord]:
    return list(session.scalars(select(MessageRecord).order_by(MessageRecord.created_at.desc())))


def _newer(file_stamp: str, stored_stamp: str) -> bool:
    return bool(file_stamp) and file_stamp > (stored_stamp or "")


def sync_from_files(session: Session, directory: Path) -> None:
    """Nowe pliki wchodzą do bazy. Nowszy `updatedAt` w pliku wygrywa z polami warsztatu."""

    by_id = {row.id: row for row in session.scalars(select(QuoteRecord))}
    for quote in load_quotes(directory):
        status = known_status(quote.status)
        row = by_id.get(quote.id)
        if row is None:
            session.add(
                QuoteRecord(
                    id=quote.id,
                    created_at=quote.createdAt,
                    updated_at=quote.updatedAt,
                    product=quote.product or "stojak",
                    status=status,
                    total=quote.price.total,
                    currency=quote.price.currency or "PLN",
                    client_name=quote.clientName,
                    client_phone=quote.clientPhone,
                    note=quote.note,
                )
            )
            continue
        row.created_at = quote.createdAt or row.created_at
        row.product = quote.product or row.product
        row.total = quote.price.total
        row.currency = quote.price.currency or row.currency
        if _newer(quote.updatedAt, row.updated_at):
            row.status = status
            row.client_name = quote.clientName
            row.client_phone = quote.clientPhone
            row.note = quote.note
            row.updated_at = quote.updatedAt
    session.commit()


def sync_messages(session: Session, directory: Path) -> None:
    by_id = {row.id: row for row in session.scalars(select(MessageRecord))}
    for raw in _raw_files(directory):
        if not MESSAGE_ID.fullmatch(str(raw.get("id") or "")):
            continue
        updated = str(raw.get("updatedAt") or "")
        row = by_id.get(raw["id"])
        if row is None:
            session.add(
                MessageRecord(
                    id=raw["id"],
                    created_at=str(raw.get("createdAt") or ""),
                    updated_at=updated,
                    name=one_line(raw.get("name"), 200),
                    email=one_line(raw.get("email"), 200),
                    phone=one_line(raw.get("phone"), 40),
                    message=str(raw.get("message") or ""),
                    handled=bool(raw.get("handled")),
                    note=note_text(raw.get("note")),
                )
            )
            continue
        row.created_at = str(raw.get("createdAt") or row.created_at)
        row.name = one_line(raw.get("name"), 200)
        row.email = one_line(raw.get("email"), 200)
        row.phone = one_line(raw.get("phone"), 40)
        row.message = str(raw.get("message") or "")
        if _newer(updated, row.updated_at):
            row.handled = bool(raw.get("handled"))
            row.note = note_text(raw.get("note"))
            row.updated_at = updated
    session.commit()


def update_quote(session: Session, directory: Path, quote_id: str, changes: dict) -> QuoteRecord | None:
    if not QUOTE_ID.fullmatch(quote_id):
        return None
    row = session.get(QuoteRecord, quote_id)
    if row is None:
        return None
    file_changes: dict[str, object] = {}
    if "status" in changes:
        if changes["status"] not in STATUSES:
            raise StatusError("Nie ma takiego statusu.")
        row.status = changes["status"]
        file_changes["status"] = row.status
    if "clientName" in changes:
        row.client_name = one_line(changes["clientName"], 80)
        file_changes["clientName"] = row.client_name
    if "clientPhone" in changes:
        row.client_phone = one_line(changes["clientPhone"], 40)
        file_changes["clientPhone"] = row.client_phone
    if "note" in changes:
        row.note = note_text(changes["note"])
        file_changes["note"] = row.note
    stamp = stamp_now()
    row.updated_at = stamp
    write_file(directory, quote_id, file_changes, stamp)
    session.commit()
    return row


def set_status(session: Session, directory: Path, quote_id: str, status: str) -> QuoteRecord | None:
    return update_quote(session, directory, quote_id, {"status": status})


def update_message(session: Session, directory: Path, message_id: str, changes: dict) -> MessageRecord | None:
    if not MESSAGE_ID.fullmatch(message_id):
        return None
    row = session.get(MessageRecord, message_id)
    if row is None:
        return None
    file_changes: dict[str, object] = {}
    if "handled" in changes:
        row.handled = bool(changes["handled"])
        file_changes["handled"] = row.handled
    if "note" in changes:
        row.note = note_text(changes["note"])
        file_changes["note"] = row.note
    stamp = stamp_now()
    row.updated_at = stamp
    write_file(directory, message_id, file_changes, stamp)
    session.commit()
    return row


def write_file(directory: Path, item_id: str, changes: dict, stamp: str) -> None:
    path = directory / f"{item_id}.json"
    if not path.is_file():
        return
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return
    if not isinstance(raw, dict):
        return
    raw.update(changes)
    raw["updatedAt"] = stamp
    path.write_text(json.dumps(raw, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def raw_quotes(directory: Path) -> dict[str, dict]:
    return {str(item.get("id")): item for item in _raw_files(directory) if item.get("id")}


def _raw_files(directory: Path) -> list[dict]:
    if not directory.is_dir():
        return []
    rows: list[dict] = []
    for path in directory.glob("*.json"):
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(raw, dict):
            rows.append(raw)
    return rows
