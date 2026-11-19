"""Oferta PDF z zapisanej wyceny. Bez maila i bez wymyślonych danych klienta."""

from __future__ import annotations

import re
from io import BytesIO
from pathlib import Path
from typing import Optional

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from stilowo_desk.describe import summarize_piece
from stilowo_desk.summary import PRODUCT_LABELS

INK = HexColor("#1b1714")
PAPER = HexColor("#f7f3ec")
AMBER = HexColor("#ef8a32")
MUTED = HexColor("#6e675f")
LINE = HexColor("#e4ddd2")

MONTHS = (
    "",
    "stycznia",
    "lutego",
    "marca",
    "kwietnia",
    "maja",
    "czerwca",
    "lipca",
    "sierpnia",
    "września",
    "października",
    "listopada",
    "grudnia",
)

FONT_DIR = Path(__file__).resolve().parent / "fonts"
_FONTS_READY = False


def _fonts() -> None:
    global _FONTS_READY
    if _FONTS_READY:
        return
    pdfmetrics.registerFont(TTFont("Stilowo", str(FONT_DIR / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("StilowoBold", str(FONT_DIR / "DejaVuSans-Bold.ttf")))
    pdfmetrics.registerFontFamily(
        "Stilowo",
        normal="Stilowo",
        bold="StilowoBold",
        italic="Stilowo",
        boldItalic="StilowoBold",
    )
    _FONTS_READY = True


def _xml(value: object) -> str:
    text = "" if value is None else str(value)
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _zloty(amount: object) -> str:
    try:
        number = int(amount)
    except (TypeError, ValueError):
        number = 0
    grouped = f"{number:,}".replace(",", " ")
    return f"{grouped} zł"


def _date(value: object) -> str:
    match = re.match(r"(\d{4})-(\d{2})-(\d{2})", str(value or ""))
    if not match:
        return ""
    year, month, day = (int(part) for part in match.groups())
    if month < 1 or month > 12:
        return ""
    return f"{day} {MONTHS[month]} {year}"


def _lines(raw: dict) -> list[dict]:
    price = raw.get("price") if isinstance(raw.get("price"), dict) else {}
    lines = price.get("lines") if isinstance(price.get("lines"), list) else []
    cleaned = []
    for line in lines:
        if not isinstance(line, dict):
            continue
        cleaned.append(
            {
                "label": str(line.get("label") or ""),
                "detail": str(line.get("detail") or ""),
                "amount": line.get("amount") or 0,
            }
        )
    return cleaned


def _preview(raw: dict, quotes_dir: Optional[Path]) -> Optional[Path]:
    if quotes_dir is None:
        return None
    preview = raw.get("preview") if isinstance(raw.get("preview"), dict) else {}
    url = str(preview.get("url") or "")
    if not url.startswith("/uploads/"):
        return None
    name = Path(url).name
    if not name or name != Path(name).name:
        return None
    path = (quotes_dir.parent / "uploads" / name).resolve()
    uploads = (quotes_dir.parent / "uploads").resolve()
    if uploads not in path.parents or not path.is_file():
        return None
    return path


def render_offer(raw: dict, quotes_dir: Optional[Path] = None) -> bytes:
    _fonts()
    product = str(raw.get("product") or "stojak")
    product_name = PRODUCT_LABELS.get(product, PRODUCT_LABELS["stojak"])
    quote_id = str(raw.get("id") or "")
    price = raw.get("price") if isinstance(raw.get("price"), dict) else {}
    total = price.get("total") or 0
    client = str(raw.get("clientName") or "").strip()
    phone = str(raw.get("clientPhone") or "").strip()
    note = str(raw.get("note") or "").strip()
    summary = summarize_piece(raw)

    title = ParagraphStyle("title", fontName="StilowoBold", fontSize=18, leading=22, textColor=INK)
    body = ParagraphStyle("body", fontName="Stilowo", fontSize=9, leading=13, textColor=INK)
    muted = ParagraphStyle("muted", fontName="Stilowo", fontSize=8, leading=11, textColor=MUTED)
    label = ParagraphStyle("label", fontName="StilowoBold", fontSize=9, leading=12, textColor=INK)
    amount = ParagraphStyle("amount", fontName="Stilowo", fontSize=9, leading=12, textColor=INK, alignment=TA_RIGHT)
    amount_bold = ParagraphStyle(
        "amountBold", fontName="StilowoBold", fontSize=12, leading=15, textColor=INK, alignment=TA_RIGHT
    )
    head = ParagraphStyle("head", fontName="StilowoBold", fontSize=8, leading=10, textColor=white)

    story = [
        Spacer(1, 8),
        Paragraph("Oferta", title),
        Spacer(1, 4),
        Paragraph(_xml(f"{quote_id} · {product_name}"), label),
    ]
    written = _date(raw.get("createdAt"))
    if written:
        story.append(Paragraph(_xml(written), muted))
    story.append(Spacer(1, 10))

    if client or phone:
        bits = [part for part in (client, phone) if part]
        story.append(Paragraph(_xml(" · ".join(bits)), body))
        story.append(Spacer(1, 8))

    picture = _preview(raw, quotes_dir)
    if picture is not None:
        image = Image(str(picture))
        image._restrictSize(78 * mm, 52 * mm)
        image.hAlign = "LEFT"
        story.append(image)
        story.append(Spacer(1, 8))

    if summary:
        story.append(Paragraph(_xml(summary), body))
        story.append(Spacer(1, 10))

    rows = [[Paragraph("Pozycja", head), Paragraph("Kwota", head)]]
    for line in _lines(raw):
        detail = f"<br/>{ _xml(line['detail']) }" if line["detail"] else ""
        rows.append(
            [
                Paragraph(f"<b>{_xml(line['label'])}</b>{detail}", body),
                Paragraph(_xml(_zloty(line["amount"])), amount),
            ]
        )
    rows.append([Paragraph("Razem", label), Paragraph(_xml(_zloty(total)), amount_bold)])

    table = Table(rows, colWidths=[128 * mm, 32 * mm])
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("BACKGROUND", (0, -1), (-1, -1), white),
        ("LINEABOVE", (0, -1), (-1, -1), 1.5, AMBER),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]
    if len(rows) > 2:
        commands[1:1] = [
            ("BACKGROUND", (0, 1), (-1, -2), PAPER),
            ("LINEBELOW", (0, 1), (-1, -2), 0.3, LINE),
        ]
    table.setStyle(TableStyle(commands))
    story.append(table)

    if note:
        story.append(Spacer(1, 12))
        story.append(Paragraph("Ustalenia", label))
        story.append(Spacer(1, 3))
        story.append(Paragraph(_xml(note).replace("\n", "<br/>"), body))

    story.append(Spacer(1, 14))
    story.append(
        Paragraph(
            "Kwota z kalkulatora. Przed produkcją potwierdzamy ją w warsztacie.",
            muted,
        )
    )

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=28 * mm,
        bottomMargin=16 * mm,
        title=f"Oferta {quote_id}",
        author="Stilowo",
    )
    document.build(story, onFirstPage=_header, onLaterPages=_header)
    return buffer.getvalue()


def _header(canvas, _doc) -> None:
    _fonts()
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(INK)
    canvas.rect(0, height - 22 * mm, width, 22 * mm, fill=1, stroke=0)
    canvas.setFillColor(AMBER)
    canvas.rect(0, height - 23.2 * mm, width, 1.2 * mm, fill=1, stroke=0)
    canvas.setFillColor(PAPER)
    canvas.setFont("StilowoBold", 13)
    canvas.drawString(18 * mm, height - 12 * mm, "STILOWO")
    canvas.setFont("Stilowo", 8)
    canvas.drawString(18 * mm, height - 17 * mm, "Drewno w dobrym stylu")
    canvas.drawRightString(width - 18 * mm, height - 9 * mm, "ul. Grodzisko 10")
    canvas.drawRightString(width - 18 * mm, height - 13.5 * mm, "Pogorzyce 32-500")
    canvas.drawRightString(width - 18 * mm, height - 18 * mm, "535 947 696")
    canvas.restoreState()
