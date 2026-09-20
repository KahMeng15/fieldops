"""deployment settings and field type

Revision ID: 002
Revises: 001
Create Date: 2026-09-20 15:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Alter deployment_type from enum to varchar if not already varchar
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'deployments' AND column_name = 'deployment_type' AND data_type = 'USER-DEFINED'
            ) THEN
                ALTER TABLE deployments ALTER COLUMN deployment_type TYPE VARCHAR USING deployment_type::text;
            END IF;
        END $$;
    """)

def downgrade() -> None:
    pass
