"""Podsumowanie wycen do pulpitu warsztatu."""

from __future__ import annotations

from pydantic import BaseModel, Field

from stilowo_desk.quotes import Quote

STATUSES = ("nowa", "rozmowa", "produkcja", "gotowa", "odebrana")
STATUS_LABELS = {
    "nowa": "Nowa",
    "rozmowa": "W rozmowie",
    "produkcja": "W produkcji",
    "gotowa": "Gotowa",
    "odebrana": "Odebrana",
}
PRODUCT_LABELS = {
    "stojak": "Stojak na drewno",
    "polka-rtv": "Półka pod telewizor",
    "regal": "Regał asymetryczny",
    "barierka": "Barierka balkonowa",
}


class StatusCount(BaseModel):
    id: str
    label: str
    count: int


class ProductCount(BaseModel):
    id: str
    label: str
    count: int
    total: int


class QuoteRow(BaseModel):
    id: str
    createdAt: str
    product: str
    productName: str
    status: str
    statusLabel: str
    total: int
    clientName: str


class Dashboard(BaseModel):
    quoteCount: int
    revenue: int
    currency: str = "PLN"
    statuses: list[StatusCount]
    products: list[ProductCount]
    recent: list[QuoteRow] = Field(default_factory=list)


def known_status(value: str) -> str:
    return value if value in STATUSES else "nowa"


def summarize(quotes: list[Quote], recent_limit: int = 8) -> Dashboard:
    ordered = sorted(quotes, key=lambda quote: quote.createdAt, reverse=True)
    by_status = {status: 0 for status in STATUSES}
    by_product: dict[str, ProductCount] = {}

    for quote in ordered:
        status = known_status(quote.status)
        by_status[status] += 1
        product = quote.product or "stojak"
        row = by_product.get(product)
        if row is None:
            row = ProductCount(
                id=product,
                label=PRODUCT_LABELS.get(product, product),
                count=0,
                total=0,
            )
            by_product[product] = row
        row.count += 1
        row.total += quote.price.total

    recent = [
        QuoteRow(
            id=quote.id,
            createdAt=quote.createdAt,
            product=quote.product or "stojak",
            productName=PRODUCT_LABELS.get(quote.product or "stojak", quote.product or "Stojak na drewno"),
            status=known_status(quote.status),
            statusLabel=STATUS_LABELS[known_status(quote.status)],
            total=quote.price.total,
            clientName=quote.clientName,
        )
        for quote in ordered[:recent_limit]
    ]

    return Dashboard(
        quoteCount=len(quotes),
        revenue=sum(quote.price.total for quote in ordered),
        statuses=[
            StatusCount(id=status, label=STATUS_LABELS[status], count=by_status[status])
            for status in STATUSES
        ],
        products=sorted(by_product.values(), key=lambda item: item.total, reverse=True),
        recent=recent,
    )
