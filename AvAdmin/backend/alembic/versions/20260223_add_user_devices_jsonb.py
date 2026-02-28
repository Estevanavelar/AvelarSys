"""add global devices column to users

Revision ID: 20260223_add_user_devices_jsonb
Revises: 20260205_add_user_modules_client_type
Create Date: 2026-02-23
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260223_add_user_devices_jsonb"
down_revision = "20260205_add_user_modules_client_type"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "devices",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
            comment="List of customer devices linked to this CPF",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "devices")
