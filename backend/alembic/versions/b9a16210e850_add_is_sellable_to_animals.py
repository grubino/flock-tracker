"""add_is_sellable_to_animals

Revision ID: b9a16210e850
Revises: 9dfff04bbfc4
Create Date: 2025-10-10 09:18:23.468979

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b9a16210e850'
down_revision: Union[str, None] = '9dfff04bbfc4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('animals', sa.Column('is_sellable', sa.Boolean(), nullable=True, server_default='0'))


def downgrade() -> None:
    op.drop_column('animals', 'is_sellable')
