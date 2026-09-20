"""add deployment_folder to deployments

Revision ID: 007
Revises: 006
Create Date: 2026-09-20 20:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '007'
down_revision: Union[str, None] = '006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.execute("""
        ALTER TABLE deployments 
        ADD COLUMN IF NOT EXISTS deployment_folder VARCHAR;
    """)

def downgrade() -> None:
    op.execute("""
        ALTER TABLE deployments 
        DROP COLUMN IF EXISTS deployment_folder;
    """)
