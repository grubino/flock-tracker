"""merge_heads

Revision ID: 9dfff04bbfc4
Revises: 2e0ff4d6cc7d, d5f7e8a9b1c2
Create Date: 2025-10-10 09:18:19.654572

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9dfff04bbfc4'
down_revision: Union[str, None] = ('2e0ff4d6cc7d', 'd5f7e8a9b1c2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
