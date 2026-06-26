"""add pending_registrations table

Revision ID: d8a2f3b1c904
Revises: c463930a6459
Create Date: 2026-06-26

"""
from typing import Union, Sequence
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'd8a2f3b1c904'
down_revision: Union[str, Sequence[str], None] = 'c463930a6459'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'pending_registrations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(200), nullable=False, unique=True),
        sa.Column('nom_complet', sa.String(200), nullable=True),
        sa.Column('mot_de_passe_hash', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=True, server_default='lecteur'),
        sa.Column('code', sa.String(6), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('cree_le', sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('pending_registrations')
