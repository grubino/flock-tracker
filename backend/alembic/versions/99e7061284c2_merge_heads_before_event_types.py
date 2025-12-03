"""merge_heads_before_event_types

Revision ID: 99e7061284c2
Revises: b9a16210e850, f8c9d3e2a4b1
Create Date: 2025-11-29 11:44:32.350547

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99e7061284c2'
down_revision: Union[str, None] = ('b9a16210e850', 'f8c9d3e2a4b1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
