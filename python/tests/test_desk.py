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


PASSWORD = "warsztat-test"


def login(client: TestClient) -> None:
    response = client.post("/api/panel/login", json={"password": PASSWORD})
    assert response.status_code == 200


def test_status_is_stored_and_mirrored_to_the_quote_file(monkeypatch, tmp_path: Path) -> None:
    quotes = tmp_path / "quotes"
    write_quote(
        quotes,
        "FL-DESK2.json",
        {
            "id": "FL-DESK2",
            "createdAt": "2026-11-01T10:00:00.000Z",
            "updatedAt": "2026-11-01T10:00:00.000Z",
            "product": "barierka",
            "status": "nowa",
            "price": {"total": 1993},
            "clientName": "",
        },
    )
    monkeypatch.setenv("STILOWO_DATABASE_URL", f"sqlite:///{tmp_path / 'desk.db'}")
    monkeypatch.setenv("STILOWO_QUOTES_DIR", str(quotes))
    monkeypatch.setenv("ADMIN_PASSWORD", PASSWORD)
    monkeypatch.setenv("ADMIN_SECRET", "test-secret")

    with TestClient(app) as client:
        assert client.get("/api/dashboard").status_code == 401
        login(client)
        board = client.get("/api/dashboard").json()
        assert board["quoteCount"] == 1
        assert board["revenue"] == 1993
        assert board["quotes"][0]["status"] == "nowa"

        saved = client.patch("/api/quotes/FL-DESK2", json={"status": "produkcja"})
        assert saved.status_code == 200
        assert saved.json()["statusLabel"] == "W produkcji"

        mirrored = json.loads((quotes / "FL-DESK2.json").read_text(encoding="utf-8"))
        assert mirrored["status"] == "produkcja"

        write_quote(
            quotes,
            "FL-DESK2.json",
            {**mirrored, "status": "nowa", "updatedAt": "2026-11-01T10:00:00.000Z"},
        )
        kept = client.get("/api/dashboard").json()
        assert kept["quotes"][0]["status"] == "produkcja"
        assert kept["statuses"][2]["count"] == 1

        write_quote(
            quotes,
            "FL-DESK2.json",
            {**mirrored, "status": "gotowa", "updatedAt": "2099-01-01T00:00:00.000Z"},
        )
        newer = client.get("/api/dashboard").json()
        assert newer["quotes"][0]["status"] == "gotowa"

        missing = client.patch("/api/quotes/FL-BRAK2", json={"status": "nowa"})
        assert missing.status_code == 404
        rejected = client.patch("/api/quotes/FL-DESK2", json={"status": "zly"})
        assert rejected.status_code == 400
        assert rejected.json()["error"] == "Nie ma takiego statusu."


def test_panel_reads_quotes_and_messages(monkeypatch, tmp_path: Path) -> None:
    quotes = tmp_path / "quotes"
    messages = tmp_path / "messages"
    write_quote(
        quotes,
        "FL-DESK2.json",
        {
            "id": "FL-DESK2",
            "createdAt": "2026-11-17T12:00:00.000Z",
            "product": "barierka",
            "status": "nowa",
            "price": {"total": 1993, "lines": [{"label": "Pręty", "detail": "1,2 cm", "amount": 392}]},
            "config": {
                "length": 300,
                "height": 110,
                "postWidth": 4,
                "postDepth": 4,
                "handrailWidth": 4,
                "handrailThickness": 2,
                "bars": "pion",
                "fill": "pret",
                "barDiameter": 1.2,
                "barGap": 11,
                "mount": "plyta",
                "paint": "czern",
            },
            "preview": {"url": "/uploads/quotes/FL-DESK2.jpg"},
        },
    )
    write_quote(
        messages,
        "WK-DESK2.json",
        {
            "id": "WK-DESK2",
            "createdAt": "2026-11-17T12:05:00.000Z",
            "name": "Warsztat",
            "email": "warsztat@example.com",
            "phone": "500 000 000",
            "message": "Pytanie o barierkę",
            "handled": False,
        },
    )
    monkeypatch.setenv("STILOWO_DATABASE_URL", f"sqlite:///{tmp_path / 'desk.db'}")
    monkeypatch.setenv("STILOWO_QUOTES_DIR", str(quotes))
    monkeypatch.setenv("STILOWO_MESSAGES_DIR", str(messages))
    monkeypatch.setenv("ADMIN_PASSWORD", PASSWORD)
    monkeypatch.setenv("ADMIN_SECRET", "test-secret")

    with TestClient(app) as client:
        assert client.get("/api/panel/desk").status_code == 401
        login(client)
        desk = client.get("/api/panel/desk").json()
        assert desk["dashboard"]["quoteCount"] == 1
        assert desk["dashboard"]["revenue"] == 1993
        quote = desk["quotes"][0]
        assert "300 × 110 cm" in quote["summary"]
        assert quote["price"]["lines"][0]["amount"] == 392
        assert quote["preview"]["url"].endswith("FL-DESK2.jpg")
        assert desk["messages"][0]["message"] == "Pytanie o barierkę"

        saved = client.patch(
            "/api/panel/quotes/FL-DESK2",
            json={"status": "produkcja", "clientName": "Kowalski", "note": "Odbiór w piątek"},
        )
        assert saved.status_code == 200
        assert saved.json()["status"] == "produkcja"
        assert saved.json()["clientName"] == "Kowalski"
        mirrored = json.loads((quotes / "FL-DESK2.json").read_text(encoding="utf-8"))
        assert mirrored["note"] == "Odbiór w piątek"

        handled = client.patch("/api/panel/messages/WK-DESK2", json={"handled": True})
        assert handled.status_code == 200
        assert handled.json()["handled"] is True
        message_file = json.loads((messages / "WK-DESK2.json").read_text(encoding="utf-8"))
        assert message_file["handled"] is True


def test_rate_card_is_saved_and_written_for_the_calculator(monkeypatch, tmp_path: Path) -> None:
    rates_path = tmp_path / "rates.json"
    monkeypatch.setenv("STILOWO_DATABASE_URL", f"sqlite:///{tmp_path / 'desk.db'}")
    monkeypatch.setenv("STILOWO_QUOTES_DIR", str(tmp_path / "quotes"))
    monkeypatch.setenv("STILOWO_RATES_FILE", str(rates_path))
    monkeypatch.setenv("ADMIN_PASSWORD", PASSWORD)
    monkeypatch.setenv("ADMIN_SECRET", "test-secret")

    with TestClient(app) as client:
        assert client.get("/api/panel/rates").status_code == 401
        login(client)
        opened = client.get("/api/panel/rates").json()
        assert opened["rates"]["woods"]["dab"] == 520
        assert opened["defaults"]["frame3"] == 32
        assert json.loads(rates_path.read_text(encoding="utf-8"))["laborBase"] == 200

        changed = dict(opened["rates"])
        changed["woods"] = {**changed["woods"], "dab": 600}
        saved = client.put("/api/panel/rates", json=changed)
        assert saved.status_code == 200
        assert saved.json()["rates"]["woods"]["dab"] == 600
        assert json.loads(rates_path.read_text(encoding="utf-8"))["woods"]["dab"] == 600

        rejected = client.put("/api/panel/rates", json={**changed, "frame2": -1})
        assert rejected.status_code == 400
        assert "20 000" in rejected.json()["error"]
