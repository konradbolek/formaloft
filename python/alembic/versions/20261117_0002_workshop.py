"""Telefon i notatka przy wycenie oraz tabela wiadomości."""

from alembic import op
import sqlalchemy as sa

revision = "0002_workshop"
down_revision = "0001_quotes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("quotes", sa.Column("client_phone", sa.String(length=40), nullable=False, server_default=""))
    op.add_column("quotes", sa.Column("note", sa.Text(), nullable=False, server_default=""))
    op.create_table(
        "messages",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("created_at", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("updated_at", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("name", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("email", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("phone", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("message", sa.Text(), nullable=False, server_default=""),
        sa.Column("handled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_table("messages")
    op.drop_column("quotes", "note")
    op.drop_column("quotes", "client_phone")
