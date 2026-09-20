"""add lead_engineer and assisting_engineers to deployments

Revision ID: 006
Revises: 005
Create Date: 2026-09-20 19:42:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '006'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.execute("""
        ALTER TABLE deployments 
        ADD COLUMN IF NOT EXISTS lead_engineer VARCHAR,
        ADD COLUMN IF NOT EXISTS assisting_engineers VARCHAR;
    """)

def downgrade() -> None:
    op.execute("""
        ALTER TABLE deployments 
        DROP COLUMN IF EXISTS lead_engineer,
        DROP COLUMN IF EXISTS assisting_engineers;
    """)
