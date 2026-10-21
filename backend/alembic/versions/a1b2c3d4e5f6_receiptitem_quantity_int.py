"""receiptitem quantity int

Revision ID: a1b2c3d4e5f6
Revises: d59ae851e714
Create Date: 2026-10-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'd59ae851e714'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        'receiptitem',
        'quantity',
        existing_type=sa.Numeric(precision=12, scale=3),
        type_=sa.Integer(),
        existing_nullable=True,
        postgresql_using='quantity::integer',
    )


def downgrade() -> None:
    op.alter_column(
        'receiptitem',
        'quantity',
        existing_type=sa.Integer(),
        type_=sa.Numeric(precision=12, scale=3),
        existing_nullable=True,
    )
