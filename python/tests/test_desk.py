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


def test_offer_pdf_uses_the_saved_quote(monkeypatch, tmp_path: Path) -> None:
    quotes = tmp_path / "quotes"
    write_quote(
        quotes,
        "FL-DESK2.json",
        {
            "id": "FL-DESK2",
            "createdAt": "2026-11-17T12:00:00.000Z",
            "product": "barierka",
            "status": "rozmowa",
            "price": {
                "total": 1993,
                "currency": "PLN",
                "lines": [{"label": "Słupki", "detail": "6 szt.", "amount": 304}],
            },
            "config": {"length": 300, "height": 110, "paint": "czern"},
            "clientName": "Kowalski",
            "clientPhone": "500 000 000",
            "note": "Odbiór w piątek",
        },
    )
    monkeypatch.setenv("STILOWO_DATABASE_URL", f"sqlite:///{tmp_path / 'desk.db'}")
    monkeypatch.setenv("STILOWO_QUOTES_DIR", str(quotes))
    monkeypatch.setenv("ADMIN_PASSWORD", PASSWORD)
    monkeypatch.setenv("ADMIN_SECRET", "test-secret")

    with TestClient(app) as client:
        assert client.get("/api/panel/quotes/FL-DESK2/offer").status_code == 401
        login(client)
        assert client.get("/api/panel/quotes/FL-BRAK2/offer").status_code == 404
        response = client.get("/api/panel/quotes/FL-DESK2/offer")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert "Stilowo-FL-DESK2.pdf" in response.headers["content-disposition"]

        from pypdf import PdfReader
        from io import BytesIO

        text = "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(response.content)).pages)
        assert "STILOWO" in text
        assert "ul. Grodzisko 10" in text
        assert "Pogorzyce 32-500" in text
        assert "535 947 696" in text
        assert "FL-DESK2" in text
        assert "Barierka balkonowa" in text
        assert "1 993 zł" in text
        assert "Słupki" in text
        assert "Kowalski" in text
        assert "Odbiór w piątek" in text
        assert "17 listopada 2026" in text
        assert "@" not in text


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
        assert opened["rates"]["labor"]["barierka"] == 280
        assert opened["rates"]["steel"]["20"]["frame3"] == 32
        assert json.loads(rates_path.read_text(encoding="utf-8"))["laborBase"] == 200

        changed = dict(opened["rates"])
        changed["woods"] = {**changed["woods"], "dab": 600}
        changed["labor"] = {**changed["labor"], "regal": 400}
        saved = client.put("/api/panel/rates", json=changed)
        assert saved.status_code == 200
        assert saved.json()["rates"]["woods"]["dab"] == 600
        assert saved.json()["rates"]["labor"]["regal"] == 400
        assert json.loads(rates_path.read_text(encoding="utf-8"))["labor"]["regal"] == 400

        rejected = client.put("/api/panel/rates", json={**changed, "frame2": -1})
        assert rejected.status_code == 400
        assert "20 000" in rejected.json()["error"]


def test_assistant_answers_from_the_queue_and_stays_off_without_a_key(monkeypatch, tmp_path: Path) -> None:
    quotes = tmp_path / "quotes"
    messages = tmp_path / "messages"
    write_quote(
        quotes,
        "FL-DESK2.json",
        {
            "id": "FL-DESK2",
            "createdAt": "2026-11-17T12:00:00.000Z",
            "product": "stojak",
            "status": "produkcja",
            "price": {"total": 699, "lines": []},
            "config": {"height": 140, "width": 45, "depth": 30, "frameThickness": 3, "wood": "dab", "paint": "czern"},
            "clientName": "Kowalski",
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
            "message": "Pytanie o termin",
            "handled": False,
        },
    )
    monkeypatch.setenv("STILOWO_DATABASE_URL", f"sqlite:///{tmp_path / 'desk.db'}")
    monkeypatch.setenv("STILOWO_QUOTES_DIR", str(quotes))
    monkeypatch.setenv("STILOWO_MESSAGES_DIR", str(messages))
    monkeypatch.setenv("ADMIN_PASSWORD", PASSWORD)
    monkeypatch.setenv("ADMIN_SECRET", "test-secret")
    monkeypatch.setenv("OPENAI_API_KEY", "")

    from stilowo_desk.assistant import Answer, workshop_brief

    seen = {}

    def fake_complete(question: str, brief: str) -> Answer:
        seen["question"] = question
        seen["brief"] = brief
        return Answer(answer="W produkcji jest jedna wycena.", quoteIds=["FL-DESK2", "FL-NIEMA"])

    with TestClient(app) as client:
        assert client.post("/api/panel/assistant", json={"question": "Ile jest w produkcji?"}).status_code == 401
        login(client)
        off = client.post("/api/panel/assistant", json={"question": "Ile jest w produkcji?"})
        assert off.status_code == 503
        assert "OPENAI_API_KEY" in off.json()["error"]

        monkeypatch.setattr("stilowo_desk.assistant.complete", fake_complete)
        empty = client.post("/api/panel/assistant", json={"question": "   "})
        assert empty.status_code == 400

        answered = client.post("/api/panel/assistant", json={"question": "Ile jest w produkcji?"})
        assert answered.status_code == 200
        body = answered.json()
        assert body["answer"] == "W produkcji jest jedna wycena."
        assert body["quoteIds"] == ["FL-DESK2"]
        assert "FL-DESK2" in seen["brief"]
        assert "699" in seen["brief"]
        assert "warsztat@example.com" not in seen["brief"]
        assert "Kowalski" in seen["brief"]
        brief = workshop_brief({"quotes": [], "messages": [], "dashboard": {}}, {"woods": {"dab": 520}})
        assert "520" in brief
        assert "utarg" in brief


def test_realizations_are_edited_in_the_panel_and_published_on_the_site(monkeypatch, tmp_path: Path) -> None:
    from io import BytesIO

    from PIL import Image

    quotes = tmp_path / "quotes"
    quotes.mkdir()
    monkeypatch.setenv("STILOWO_DATABASE_URL", f"sqlite:///{tmp_path / 'desk.db'}")
    monkeypatch.setenv("STILOWO_QUOTES_DIR", str(quotes))
    monkeypatch.setenv("ADMIN_PASSWORD", PASSWORD)
    monkeypatch.setenv("ADMIN_SECRET", "test-secret")

    with TestClient(app) as client:
        public = client.get("/api/realizations")
        assert public.status_code == 200
        shown = public.json()["items"]
        assert [item["id"] for item in shown] == ["RZ-STOJAK"]
        assert shown[0]["title"] == "Stojak na drewno przy schodach"
        assert "clientName" not in shown[0]
        assert client.get("/api/realizations/RZ-STOJAK/photo").status_code == 404

        assert client.post("/api/panel/realizations", json={"title": "Szkic"}).status_code == 401
        login(client)
        created = client.post("/api/panel/realizations", json={"title": "Szkic półki"})
        assert created.status_code == 200
        draft = created.json()
        assert draft["published"] is False
        assert draft["id"].startswith("RZ-")
        still = client.get("/api/realizations").json()["items"]
        assert [item["id"] for item in still] == ["RZ-STOJAK"]

        published = client.patch(
            f"/api/panel/realizations/{draft['id']}",
            json={"published": True, "calculatorPath": "/kalkulator/polka-pod-telewizor"},
        )
        assert published.status_code == 200
        assert [item["id"] for item in client.get("/api/realizations").json()["items"]] == [
            "RZ-STOJAK",
            draft["id"],
        ]
        rejected = client.patch(
            f"/api/panel/realizations/{draft['id']}",
            json={"calculatorPath": "https://example.com"},
        )
        assert rejected.status_code == 400

        buffer = BytesIO()
        Image.new("RGB", (8, 8), (20, 20, 20)).save(buffer, "JPEG")
        photo = client.post(
            f"/api/panel/realizations/{draft['id']}/photo",
            files={"photo": ("mebel.jpg", buffer.getvalue(), "image/jpeg")},
        )
        assert photo.status_code == 200
        assert photo.json()["image"] == f"/desk/api/realizations/{draft['id']}/photo"
        opened = client.get(f"/api/realizations/{draft['id']}/photo")
        assert opened.status_code == 200
        assert opened.headers["content-type"].startswith("image/jpeg")

        removed = client.delete(f"/api/panel/realizations/{draft['id']}")
        assert removed.status_code == 200
        assert client.get(f"/api/realizations/{draft['id']}/photo").status_code == 404
        assert [item["id"] for item in client.get("/api/realizations").json()["items"]] == ["RZ-STOJAK"]
