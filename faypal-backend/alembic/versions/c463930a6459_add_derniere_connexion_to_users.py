"""add_derniere_connexion_to_users

Revision ID: c463930a6459
Revises: 45bf6855ae0f
Create Date: 2026-06-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c463930a6459'
down_revision: Union[str, Sequence[str], None] = '45bf6855ae0f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('derniere_connexion', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'derniere_connexion')
