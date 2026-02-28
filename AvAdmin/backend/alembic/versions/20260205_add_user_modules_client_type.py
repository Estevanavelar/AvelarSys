"""add user modules and client_type

Revision ID: 20260205_add_user_modules_client_type
Revises: 20260129_add_user_address_neighborhood
Create Date: 2026-02-05
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260205_add_user_modules_client_type"
down_revision = "20260129_add_user_address_neighborhood"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "client_type",
            sa.Enum("cliente", "lojista", "distribuidor", "admin", name="client_type", create_type=False),
            nullable=True
        )
    )
    op.add_column(
        "users",
        sa.Column(
            "enabled_modules",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            comment="List of enabled modules per user"
        )
    )


def downgrade() -> None:
    op.drop_column("users", "enabled_modules")
    op.drop_column("users", "client_type")
