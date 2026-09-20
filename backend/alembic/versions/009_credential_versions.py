"""create credential_versions table for historical credentials recovery

Revision ID: 009
Revises: 008
Create Date: 2026-09-20 20:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '009'
down_revision: Union[str, None] = '008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS credential_versions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            credential_id UUID NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
            deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
            version_number INTEGER NOT NULL,
            credential_type VARCHAR NOT NULL,
            label VARCHAR NOT NULL,
            encrypted_payload BYTEA NOT NULL,
            changed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
            changed_by_name VARCHAR,
            change_summary VARCHAR,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc')
        );

        CREATE INDEX IF NOT EXISTS idx_credential_versions_credential_id ON credential_versions(credential_id);
        CREATE INDEX IF NOT EXISTS idx_credential_versions_deployment_id ON credential_versions(deployment_id);
    """)

def downgrade() -> None:
    op.execute("""
        DROP TABLE IF EXISTS credential_versions;
    """)
