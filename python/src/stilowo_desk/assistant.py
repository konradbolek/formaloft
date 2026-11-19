"""Asystent warsztatu. Widzi kolejkę i cennik, niczego poza tym nie dopowiada."""

from __future__ import annotations

import json
import os

from pydantic import BaseModel, Field

SYSTEM = """Jesteś asystentem warsztatu Stilowo. Odpowiadasz po polsku, krótko, tylko na podstawie danych w wiadomości.
Nie wymyślasz klientów, telefonów, cen, adresów ani realizacji. Jak czegoś nie ma w danych, napisz że w kolejce tego nie ma.
Suma kwot wycen nie jest utargiem z faktur.
quoteIds to numery wycen z danych, które przywołujesz w odpowiedzi. Nie dodawaj numeru spoza danych."""


class Answer(BaseModel):
    answer: str
    quoteIds: list[str] = Field(default_factory=list)


class AssistantOff(RuntimeError):
    pass


class AssistantFailed(RuntimeError):
    pass


def _clip(value: object, limit: int = 240) -> str:
    text = " ".join(str(value or "").split())
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def workshop_brief(desk: dict, rates: dict) -> str:
    board = desk.get("dashboard") if isinstance(desk.get("dashboard"), dict) else {}
    lines = [
        f"Wyceny: {board.get('quoteCount', 0)}. Suma kwot: {board.get('revenue', 0)} zł. To nie jest utarg z faktur."
    ]
    for status in board.get("statuses") or []:
        if isinstance(status, dict):
            lines.append(f"Status {status.get('label')}: {status.get('count')}")
    lines.append("Wyceny:")
    for quote in (desk.get("quotes") or [])[:40]:
        if not isinstance(quote, dict):
            continue
        price = quote.get("price") if isinstance(quote.get("price"), dict) else {}
        bits = [
            str(quote.get("id") or ""),
            str(quote.get("productName") or ""),
            str(quote.get("status") or ""),
            f"{price.get('total') or 0} zł",
        ]
        if quote.get("clientName"):
            bits.append(f"klient {_clip(quote.get('clientName'), 80)}")
        if quote.get("clientPhone"):
            bits.append(f"telefon {_clip(quote.get('clientPhone'), 40)}")
        if quote.get("summary"):
            bits.append(_clip(quote.get("summary"), 300))
        if quote.get("note"):
            bits.append(f"notatka {_clip(quote.get('note'))}")
        lines.append(" | ".join(bit for bit in bits if bit))
    lines.append("Cennik:")
    lines.append(json.dumps(rates, ensure_ascii=False))
    messages = [item for item in (desk.get("messages") or []) if isinstance(item, dict)]
    open_count = sum(1 for item in messages if not item.get("handled"))
    lines.append(f"Wiadomości nieogarnięte: {open_count}.")
    for item in messages[:15]:
        bits = [
            str(item.get("id") or ""),
            "ogarnięta" if item.get("handled") else "nowa",
            _clip(item.get("name"), 80),
            _clip(item.get("phone"), 40),
            _clip(item.get("message")),
        ]
        lines.append(" | ".join(bit for bit in bits if bit))
    return "\n".join(lines)


def known_quote_ids(desk: dict) -> set[str]:
    found = set()
    for quote in desk.get("quotes") or []:
        if isinstance(quote, dict) and quote.get("id"):
            found.add(str(quote["id"]))
    return found


def _schema() -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "answer": {"type": "string"},
            "quoteIds": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["answer", "quoteIds"],
    }


def complete(question: str, brief: str) -> Answer:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        raise AssistantOff("Asystent nie jest włączony. W pliku warsztatu brakuje OPENAI_API_KEY.")
    from openai import OpenAI

    model = os.environ.get("STILOWO_ASSISTANT_MODEL", "").strip() or "gpt-4o-mini"
    try:
        response = OpenAI(api_key=key, timeout=30).chat.completions.create(
            model=model,
            temperature=0,
            messages=[
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": f"Dane warsztatu:\n{brief}\n\nPytanie:\n{question}"},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {"name": "workshop_answer", "strict": True, "schema": _schema()},
            },
        )
        content = response.choices[0].message.content or ""
        return Answer.model_validate_json(content)
    except AssistantOff:
        raise
    except Exception as error:
        code = getattr(error, "code", None)
        body = getattr(error, "body", None)
        if isinstance(body, dict):
            code = (body.get("error") or {}).get("code") or code
        if code in {"credit_balance_exhausted", "insufficient_quota"}:
            raise AssistantFailed("Konto OpenAI nie ma środków. Doładuj je w rozliczeniach OpenAI.") from error
        raise AssistantFailed("Nie udało się zapytać asystenta.") from error


def ask(question: str, desk: dict, rates: dict) -> Answer:
    text = " ".join(question.split())
    if not text:
        raise ValueError("Wpisz pytanie.")
    if len(text) > 800:
        raise ValueError("Pytanie może mieć najwyżej 800 znaków.")
    brief = workshop_brief(desk, rates)
    answer = complete(text, brief)
    allowed = known_quote_ids(desk)
    answer.quoteIds = [item for item in answer.quoteIds if item in allowed]
    cleaned = answer.answer.strip()
    if not cleaned:
        raise AssistantFailed("Asystent nie odpowiedział.")
    answer.answer = cleaned
    return answer
