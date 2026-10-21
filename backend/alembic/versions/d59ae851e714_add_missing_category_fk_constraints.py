"""add missing category fk constraints

Revision ID: d59ae851e714
Revises: 5b617148e652
Create Date: 2026-10-21 10:43:22.272655

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd59ae851e714'
down_revision: Union[str, Sequence[str], None] = '5b617148e652'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_foreign_key('fk_expense_category_id_category', 'expense', 'category', ['category_id'], ['id'])
    op.create_foreign_key('fk_store_category_id_category', 'store', 'category', ['category_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_store_category_id_category', 'store', type_='foreignkey')
    op.drop_constraint('fk_expense_category_id_category', 'expense', type_='foreignkey')
