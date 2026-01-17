"""merge heads

Revision ID: 7d1e9b35452c
Revises: a1b2c3d4e5f6, e002e35dbcf6
Create Date: 2026-01-07 10:24:34.594620

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7d1e9b35452c'
down_revision: Union[str, None] = ('a1b2c3d4e5f6', 'e002e35dbcf6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
