"""add user address_neighborhood

Revision ID: 20260129_add_user_address_neighborhood
Revises: f9cf70b8dcbc
Create Date: 2026-01-29
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260129_add_user_address_neighborhood"
down_revision = "f9cf70b8dcbc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("address_neighborhood", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "address_neighborhood")
