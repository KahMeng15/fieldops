"""create deployment_phase_remarks table

Revision ID: 008
Revises: 007
Create Date: 2026-09-20 20:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '008'
down_revision: Union[str, None] = '007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS deployment_phase_remarks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
            phase VARCHAR NOT NULL,
            remark TEXT NOT NULL,
            author_id UUID REFERENCES users(id) ON DELETE SET NULL,
            author_name VARCHAR,
            is_archived BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc'),
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc')
        );

        CREATE INDEX IF NOT EXISTS idx_deployment_phase_remarks_deployment_id ON deployment_phase_remarks(deployment_id);
        CREATE INDEX IF NOT EXISTS idx_deployment_phase_remarks_phase ON deployment_phase_remarks(phase);
    """)

def downgrade() -> None:
    op.execute("""
        DROP TABLE IF EXISTS deployment_phase_remarks;
    """)
