"""sync all missing deployment columns

Revision ID: 011_sync_deployment_columns
Revises: 010_account_owner
Create Date: 2026-09-24 17:13:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = '011_sync_deployment_columns'
down_revision: Union[str, Sequence[str], None] = '010_account_owner'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = [c['name'] for c in inspector.get_columns('deployments')]

    missing_cols = {
        'account_owner': sa.Column('account_owner', sa.String(), nullable=True),
        'kickoff_status': sa.Column('kickoff_status', sa.String(), nullable=True),
        'materials_status': sa.Column('materials_status', sa.String(), nullable=True),
        'uat_fat_status': sa.Column('uat_fat_status', sa.String(), nullable=True),
        'stage_statuses': sa.Column('stage_statuses', JSONB(), nullable=True),
        'kickoff_date': sa.Column('kickoff_date', sa.DateTime(), nullable=True),
        'end_date': sa.Column('end_date', sa.DateTime(), nullable=True),
        'device_status': sa.Column('device_status', sa.String(), nullable=True),
        'collected': sa.Column('collected', sa.Boolean(), default=False, nullable=True),
        'validated_by': sa.Column('validated_by', sa.String(), nullable=True),
        'product_quantity': sa.Column('product_quantity', sa.Integer(), default=1, nullable=True),
    }

    for col_name, col_def in missing_cols.items():
        if col_name not in cols:
            op.add_column('deployments', col_def)

def downgrade() -> None:
    pass
