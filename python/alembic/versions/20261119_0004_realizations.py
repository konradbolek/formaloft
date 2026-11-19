"""Realizacje pokazywane na stronie."""

import sqlalchemy as sa
from alembic import op

revision = "0004_realizations"
down_revision = "0003_rates"
branch_labels = None
depends_on = None

SEED_BODY = (
    "Czarna rama, dębowy blat i polana ułożone w środku. Stoi przy schodach, na jasnej "
    "drewnianej podłodze, obok szarej ściany i wnęki. Na zdjęciu widać krótkie nogi.\n\n"
    "W kalkulatorze ten model to 140 × 45 × 30 cm, rama 3 cm, blat dąb 2 cm, malowanie czerń. "
    "Cena modelu ze zdjęcia: 699 zł. Wysokość nóg ustawiasz osobno i nie zmienia tej kwoty. "
    "Po otwarciu kalkulator startuje z nogami 10 cm. Przycisk „Model ze zdjęcia” ustawia 0 cm, "
    "czyli wersję, od której liczymy 699 zł."
)


def upgrade() -> None:
    op.create_table(
        "realizations",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("title", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("kicker", sa.String(length=80), nullable=False, server_default=""),
        sa.Column("summary", sa.String(length=400), nullable=False, server_default=""),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("price_label", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("image", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("alt", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("calculator_path", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("sort", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.String(length=40), nullable=False, server_default=""),
    )
    op.bulk_insert(
        sa.table(
            "realizations",
            sa.column("id", sa.String),
            sa.column("title", sa.String),
            sa.column("kicker", sa.String),
            sa.column("summary", sa.String),
            sa.column("body", sa.Text),
            sa.column("price_label", sa.String),
            sa.column("image", sa.String),
            sa.column("alt", sa.String),
            sa.column("calculator_path", sa.String),
            sa.column("published", sa.Boolean),
            sa.column("sort", sa.Integer),
            sa.column("updated_at", sa.String),
        ),
        [
            {
                "id": "RZ-STOJAK",
                "title": "Stojak na drewno przy schodach",
                "kicker": "Stal i drewno",
                "summary": "Czarna rama, drewniany blat i polana w środku. Ten sam układ można zamówić w innym wymiarze.",
                "body": SEED_BODY,
                "price_label": "699 zł",
                "image": "/realizacja.jpg",
                "alt": "Czarny stojak na drewno przy schodach, z dębowym blatem i polanami w środku",
                "calculator_path": "/kalkulator/stojak-na-drewno",
                "published": True,
                "sort": 0,
                "updated_at": "2026-11-19T00:00:00.000Z",
            }
        ],
    )


def downgrade() -> None:
    op.drop_table("realizations")
