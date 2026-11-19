"""API warsztatu. Widok jest w Reactcie, tutaj zostaje JSON i baza."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from stilowo_desk.assistant import AssistantFailed, AssistantOff, ask
from stilowo_desk.auth import load_workshop_secrets, login, logout, require_workshop
from stilowo_desk.db import configure, get_session, upgrade_database
from stilowo_desk.offer import render_offer
from stilowo_desk.panel import present_message, present_quote, workshop_desk
from stilowo_desk.rates import RateView, card_from, read_card, save_card
from stilowo_desk.realizations import (
    REALIZATION_ID,
    RealizationError,
    RealizationWrite,
    create_realization,
    delete_realization,
    listed,
    photo_file,
    present as present_realization,
    save_photo,
    update_realization,
)
from stilowo_desk.store import (
    QUOTE_ID,
    StatusError,
    raw_quotes,
    records,
    set_status,
    sync_from_files,
    sync_messages,
    update_message,
    update_quote,
)
from stilowo_desk.summary import Dashboard, QuoteRow, present, summarize

PACKAGE_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = PACKAGE_ROOT.parent
DEFAULT_QUOTES = REPO_ROOT / "server" / "data" / "quotes"
DEFAULT_MESSAGES = REPO_ROOT / "server" / "data" / "messages"


def quotes_dir() -> Path:
    configured = os.environ.get("STILOWO_QUOTES_DIR", "").strip()
    return Path(configured) if configured else DEFAULT_QUOTES


def messages_dir() -> Path:
    configured = os.environ.get("STILOWO_MESSAGES_DIR", "").strip()
    return Path(configured) if configured else DEFAULT_MESSAGES


def uploads_dir() -> Path:
    return quotes_dir().parent / "uploads"


def _realization_photo(realization_id: str) -> FileResponse:
    if not REALIZATION_ID.fullmatch(realization_id):
        raise HTTPException(status_code=404, detail="Nie ma takiego zdjęcia.")
    path = photo_file(uploads_dir(), realization_id)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Nie ma takiego zdjęcia.")
    return FileResponse(path, media_type="image/jpeg")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_workshop_secrets(REPO_ROOT / "server" / ".env")
    configure()
    upgrade_database()
    yield


app = FastAPI(title="Stilowo — panel", version="0.3.0", lifespan=lifespan)


class StatusBody(BaseModel):
    status: str


class PasswordBody(BaseModel):
    password: str = ""


class QuotePatch(BaseModel):
    status: Optional[str] = None
    clientName: Optional[str] = None
    clientPhone: Optional[str] = None
    note: Optional[str] = None


class MessagePatch(BaseModel):
    handled: Optional[bool] = None
    note: Optional[str] = None


class AskBody(BaseModel):
    question: str = ""


class RealizationCreate(BaseModel):
    title: str = "Nowa realizacja"


@app.exception_handler(HTTPException)
def http_error(_request, exc: HTTPException):
    message = exc.detail if isinstance(exc.detail, str) else "Nie udało się zapisać."
    return JSONResponse(status_code=exc.status_code, content={"error": message})


@app.get("/")
def root() -> dict[str, str]:
    return {"name": "Stilowo — panel", "panel": "/api/panel/desk"}


@app.post("/api/panel/login")
def panel_login(body: PasswordBody, request: Request):
    return login(request, body.password)


@app.post("/api/panel/logout")
def panel_logout():
    return logout()


@app.get("/api/panel/session")
def panel_session(_auth: None = Depends(require_workshop)) -> dict[str, bool]:
    return {"ok": True}


@app.get("/api/panel/desk")
def panel_desk(db: Session = Depends(get_session), _auth: None = Depends(require_workshop)) -> dict:
    return workshop_desk(db, quotes_dir(), messages_dir())


@app.patch("/api/panel/quotes/{quote_id}")
def panel_quote(
    quote_id: str,
    body: QuotePatch,
    db: Session = Depends(get_session),
    _auth: None = Depends(require_workshop),
) -> dict:
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=400, detail="Nie ma czego zapisać.")
    sync_from_files(db, quotes_dir())
    try:
        row = update_quote(db, quotes_dir(), quote_id, changes)
    except StatusError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    if row is None:
        raise HTTPException(status_code=404, detail="Nie ma takiej wyceny.")
    return present_quote(row, raw_quotes(quotes_dir()).get(row.id, {}))


@app.get("/api/panel/quotes/{quote_id}/offer")
def panel_offer(
    quote_id: str,
    db: Session = Depends(get_session),
    _auth: None = Depends(require_workshop),
) -> Response:
    if not QUOTE_ID.fullmatch(quote_id):
        raise HTTPException(status_code=404, detail="Nie ma takiej wyceny.")
    directory = quotes_dir()
    sync_from_files(db, directory)
    raw = raw_quotes(directory).get(quote_id)
    if raw is None:
        raise HTTPException(status_code=404, detail="Nie ma takiej wyceny.")
    pdf = render_offer(raw, directory)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Stilowo-{quote_id}.pdf"'},
    )


@app.patch("/api/panel/messages/{message_id}")
def panel_message(
    message_id: str,
    body: MessagePatch,
    db: Session = Depends(get_session),
    _auth: None = Depends(require_workshop),
) -> dict:
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=400, detail="Nie ma czego zapisać.")
    sync_messages(db, messages_dir())
    row = update_message(db, messages_dir(), message_id, changes)
    if row is None:
        raise HTTPException(status_code=404, detail="Nie ma takiej wiadomości.")
    return present_message(row)


@app.get("/api/panel/rates", response_model=RateView)
def panel_rates(db: Session = Depends(get_session), _auth: None = Depends(require_workshop)) -> RateView:
    return read_card(db)


@app.put("/api/panel/rates", response_model=RateView)
def panel_save_rates(
    body: dict,
    db: Session = Depends(get_session),
    _auth: None = Depends(require_workshop),
) -> RateView:
    try:
        card = card_from(body)
    except ValidationError as error:
        raise HTTPException(status_code=400, detail="Stawka ma być liczbą od 0 do 20 000 zł.") from error
    return save_card(db, card)


@app.get("/api/realizations")
def public_realizations(db: Session = Depends(get_session)) -> dict:
    return {"items": listed(db, published_only=True)}


@app.get("/api/realizations/{realization_id}/photo")
def public_realization_photo(realization_id: str) -> FileResponse:
    return _realization_photo(realization_id)


@app.get("/api/panel/realizations")
def panel_realizations(db: Session = Depends(get_session), _auth: None = Depends(require_workshop)) -> dict:
    return {"items": listed(db, published_only=False)}


@app.post("/api/panel/realizations")
def panel_create_realization(
    body: RealizationCreate,
    db: Session = Depends(get_session),
    _auth: None = Depends(require_workshop),
) -> dict:
    try:
        row = create_realization(db, body.title)
    except RealizationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return present_realization(row)


@app.patch("/api/panel/realizations/{realization_id}")
def panel_update_realization(
    realization_id: str,
    body: RealizationWrite,
    db: Session = Depends(get_session),
    _auth: None = Depends(require_workshop),
) -> dict:
    try:
        row = update_realization(db, realization_id, body)
    except RealizationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    if row is None:
        raise HTTPException(status_code=404, detail="Nie ma takiej realizacji.")
    return present_realization(row)


@app.delete("/api/panel/realizations/{realization_id}")
def panel_delete_realization(
    realization_id: str,
    db: Session = Depends(get_session),
    _auth: None = Depends(require_workshop),
) -> dict:
    if not delete_realization(db, uploads_dir(), realization_id):
        raise HTTPException(status_code=404, detail="Nie ma takiej realizacji.")
    return {"ok": True}


@app.post("/api/panel/realizations/{realization_id}/photo")
def panel_realization_photo(
    realization_id: str,
    photo: UploadFile = File(...),
    db: Session = Depends(get_session),
    _auth: None = Depends(require_workshop),
) -> dict:
    raw = photo.file.read(8_000_001)
    try:
        row = save_photo(db, uploads_dir(), realization_id, raw)
    except RealizationError as error:
        status = 404 if "Nie ma takiej" in str(error) else 400
        raise HTTPException(status_code=status, detail=str(error)) from error
    return present_realization(row)


@app.post("/api/panel/assistant")
def panel_assistant(
    body: AskBody,
    db: Session = Depends(get_session),
    _auth: None = Depends(require_workshop),
) -> dict:
    try:
        desk = workshop_desk(db, quotes_dir(), messages_dir())
        rates = read_card(db).rates.model_dump(by_alias=True)
        answer = ask(body.question, desk, rates)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except AssistantOff as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except AssistantFailed as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return answer.model_dump()


@app.get("/api/dashboard", response_model=Dashboard)
def dashboard_json(
    db: Session = Depends(get_session),
    _auth: None = Depends(require_workshop),
) -> Dashboard:
    sync_from_files(db, quotes_dir())
    return summarize([row.as_quote() for row in records(db)])


@app.patch("/api/quotes/{quote_id}", response_model=QuoteRow)
def change_status(
    quote_id: str,
    body: StatusBody,
    db: Session = Depends(get_session),
    _auth: None = Depends(require_workshop),
) -> QuoteRow:
    sync_from_files(db, quotes_dir())
    try:
        row = set_status(db, quotes_dir(), quote_id, body.status)
    except StatusError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    if row is None:
        raise HTTPException(status_code=404, detail="Nie ma takiej wyceny.")
    return present(row.as_quote())
