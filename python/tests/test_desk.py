import json
from pathlib import Path

from fastapi.testclient import TestClient

from stilowo_desk.quotes import load_quotes
from stilowo_desk.summary import summarize
from stilowo_desk.app import app


def write_quote(directory: Path, name: str, payload: dict) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    (directory / name).write_text(json.dumps(payload), encoding="utf-8")


def test_missing_directory_is_empty(tmp_path: Path) -> None:
    assert load_quotes(tmp_path / "brak") == []


def test_broken_file_is_skipped(tmp_path: Path) -> None:
    write_quote(tmp_path, "FL-ABCDE.json", {"id": "FL-ABCDE", "price": {"total": 699}, "status": "nowa"})
    (tmp_path / "uszkodzona.json").write_text("{", encoding="utf-8")

    quotes = load_quotes(tmp_path)

    assert [quote.id for quote in quotes] == ["FL-ABCDE"]


def test_summary_groups_status_product_and_money() -> None:
    from stilowo_desk.quotes import Quote

    quotes = [
        Quote.model_validate(
            {"id": "FL-AAAAA", "createdAt": "2026-11-01", "product": "stojak", "status": "nowa", "price": {"total": 699}, "clientName": "Anna"}
        ),
        Quote.model_validate(
            {"id": "FL-BBBBB", "createdAt": "2026-11-02", "product": "barierka", "status": "produkcja", "price": {"total": 1993}}
        ),
        Quote.model_validate(
            {"id": "FL-CCCCC", "createdAt": "2026-11-03", "product": "barierka", "status": "zly", "price": {"total": 100}}
        ),
    ]

    board = summarize(quotes)

    assert board.quoteCount == 3
    assert board.revenue == 2792
    assert board.statuses[0].count == 2
    assert board.statuses[2].id == "produkcja"
    assert board.statuses[2].count == 1
    barierka = next(item for item in board.products if item.id == "barierka")
    assert barierka.count == 2
    assert barierka.total == 2093
    assert board.recent[0].id == "FL-CCCCC"
    assert board.recent[0].status == "nowa"


def test_page_renders_empty_desk(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("STILOWO_QUOTES_DIR", str(tmp_path))
    client = TestClient(app)

    response = client.get("/")

    assert response.status_code == 200
    assert "Pulpit warsztatu" in response.text
    assert "Katalog wycen jest pusty" in response.text

    data = client.get("/api/dashboard").json()
    assert data["quoteCount"] == 0
    assert data["revenue"] == 0
    assert len(data["statuses"]) == 5
