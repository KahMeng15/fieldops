"""add status_updated_at and status_updated_by tracking to deployments

Revision ID: 005
Revises: 004
Create Date: 2026-09-20 19:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.execute("""
        ALTER TABLE deployments 
        ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITHOUT TIME ZONE,
        ADD COLUMN IF NOT EXISTS status_updated_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS status_updated_by_name VARCHAR;

        -- Backfill existing deployments with created_at and created_by user
        UPDATE deployments d
        SET status_updated_at = COALESCE(d.updated_at, d.created_at, CURRENT_TIMESTAMP),
            status_updated_by_id = d.created_by_id,
            status_updated_by_name = u.username
        FROM users u
        WHERE d.created_by_id = u.id AND d.status_updated_at IS NULL;
    """)

def downgrade() -> None:
    op.execute("""
        ALTER TABLE deployments 
        DROP COLUMN IF EXISTS status_updated_at,
        DROP COLUMN IF EXISTS status_updated_by_id,
        DROP COLUMN IF EXISTS status_updated_by_name;
    """)
