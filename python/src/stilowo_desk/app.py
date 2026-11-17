"""Pulpit warsztatu. Czyta wyceny z kalkulatora i pokazuje ich skrót."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import HTMLResponse

from stilowo_desk.quotes import load_quotes
from stilowo_desk.summary import Dashboard, summarize

PACKAGE_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_QUOTES = PACKAGE_ROOT.parent / "server" / "data" / "quotes"


def quotes_dir() -> Path:
    configured = os.environ.get("STILOWO_QUOTES_DIR", "").strip()
    if configured:
        return Path(configured)
    return DEFAULT_QUOTES


def dashboard() -> Dashboard:
    return summarize(load_quotes(quotes_dir()))


app = FastAPI(title="Stilowo — pulpit", version="0.1.0")


@app.get("/api/dashboard", response_model=Dashboard)
def dashboard_json() -> Dashboard:
    return dashboard()


@app.get("/", response_class=HTMLResponse)
def dashboard_page() -> str:
    data = dashboard()
    status_rows = "".join(
        f"<li><span>{item.label}</span><strong>{item.count}</strong></li>" for item in data.statuses
    )
    product_rows = "".join(
        f"<li><span>{item.label}</span><strong>{item.count} · {item.total} zł</strong></li>"
        for item in data.products
    ) or "<li><span>Brak wycen</span><strong>0 zł</strong></li>"
    recent_rows = "".join(
        "<tr>"
        f"<td>{item.id}</td>"
        f"<td>{item.productName}</td>"
        f"<td>{item.statusLabel}</td>"
        f"<td>{item.total} zł</td>"
        f"<td>{item.clientName or '—'}</td>"
        "</tr>"
        for item in data.recent
    ) or "<tr><td colspan='5'>Katalog wycen jest pusty. Zapis z kalkulatora pojawi się tutaj.</td></tr>"

    return f"""<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <title>Stilowo — pulpit</title>
  <style>
    :root {{ color: #1b1714; background: #ebe4d8; font-family: "Avenir Next", sans-serif; }}
    body {{ margin: 0; }}
    main {{ max-width: 920px; margin: 0 auto; padding: 36px 20px 64px; }}
    h1 {{ font-size: 40px; letter-spacing: 0.04em; text-transform: uppercase; margin: 0 0 8px; }}
    p {{ margin: 0 0 28px; }}
    .totals {{ display: flex; gap: 16px; margin-bottom: 28px; }}
    .total {{ background: #1b1714; color: #f7f3ec; padding: 18px 20px; min-width: 180px; }}
    .total strong {{ display: block; font-size: 32px; }}
    section {{ background: #f7f3ec; padding: 18px 20px; margin-bottom: 16px; }}
    h2 {{ margin: 0 0 12px; font-size: 16px; letter-spacing: 0.12em; text-transform: uppercase; }}
    ul {{ list-style: none; margin: 0; padding: 0; }}
    li, tr {{ display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-top: 1px solid #e4dccf; }}
    table {{ width: 100%; border-collapse: collapse; }}
    td {{ padding: 8px 0; border-top: 1px solid #e4dccf; }}
    td:last-child, td:nth-child(4) {{ text-align: right; }}
  </style>
</head>
<body>
  <main>
    <h1>Pulpit warsztatu</h1>
    <p>Wyceny zapisane przez kalkulator. Suma jest zbiorem kwot, nie utargiem z faktur.</p>
    <div class="totals">
      <div class="total"><span>Wyceny</span><strong>{data.quoteCount}</strong></div>
      <div class="total"><span>Suma kwot</span><strong>{data.revenue} zł</strong></div>
    </div>
    <section>
      <h2>Statusy</h2>
      <ul>{status_rows}</ul>
    </section>
    <section>
      <h2>Produkty</h2>
      <ul>{product_rows}</ul>
    </section>
    <section>
      <h2>Ostatnie</h2>
      <table>
        <tbody>{recent_rows}</tbody>
      </table>
    </section>
  </main>
</body>
</html>"""
