"""Tabela wycen pulpitu."""

from alembic import op
import sqlalchemy as sa

revision = "0001_quotes"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "quotes",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("created_at", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("updated_at", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("product", sa.String(length=40), nullable=False, server_default="stojak"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="nowa"),
        sa.Column("total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="PLN"),
        sa.Column("client_name", sa.String(length=200), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_table("quotes")
