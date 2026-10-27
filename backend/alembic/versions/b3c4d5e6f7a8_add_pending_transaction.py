"""add pending_transaction table

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6
Create Date: 2026-10-22 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'b3c4d5e6f7a8'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'pending_transaction',
        sa.Column('id',         sa.Integer(),    nullable=False),
        sa.Column('user_id',    sa.Integer(),    nullable=False),
        sa.Column('type',       sa.String(),     nullable=False),
        sa.Column('payload',    sa.Text(),       nullable=False),
        sa.Column('status',     sa.String(),     nullable=False, server_default='in_progress'),
        sa.Column('created_at', sa.DateTime(),   nullable=False),
        sa.Column('expires_at', sa.DateTime(),   nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
    )
    op.create_index('ix_pending_transaction_user_id', 'pending_transaction', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_pending_transaction_user_id', 'pending_transaction')
    op.drop_table('pending_transaction')
