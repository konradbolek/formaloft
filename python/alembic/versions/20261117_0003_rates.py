"""Tabela cennika."""

from alembic import op
import sqlalchemy as sa

revision = "0003_rates"
down_revision = "0002_workshop"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rate_card",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("payload", sa.Text(), nullable=False, server_default=""),
        sa.Column("updated_at", sa.String(length=40), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_table("rate_card")
