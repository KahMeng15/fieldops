"""initial

Revision ID: 001
Revises: 
Create Date: 2024-05-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # roles
    op.create_table('roles',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('permissions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_roles_name'), 'roles', ['name'], unique=True)
    
    # teams
    op.create_table('teams',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_teams_name'), 'teams', ['name'], unique=True)
    
    # users
    op.create_table('users',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('username', sa.String(), nullable=True),
    sa.Column('email', sa.String(), nullable=True),
    sa.Column('password_hash', sa.String(), nullable=True),
    sa.Column('team_id', sa.UUID(), nullable=True),
    sa.Column('role_id', sa.UUID(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('last_login_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
    sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    
    # lookup_categories
    op.create_table('lookup_categories',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    
    # lookup_values
    op.create_table('lookup_values',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('category_id', sa.UUID(), nullable=True),
    sa.Column('value', sa.String(), nullable=True),
    sa.Column('display_order', sa.Integer(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['category_id'], ['lookup_categories.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    
    # deployments
    op.create_table('deployments',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('internal_group_name', sa.String(), nullable=True),
    sa.Column('customer_name', sa.String(), nullable=True),
    sa.Column('location', sa.String(), nullable=True),
    sa.Column('account_owner_id', sa.UUID(), nullable=True),
    sa.Column('deployment_type', sa.Enum('POC', 'Deployment', name='deploymenttype'), nullable=True),
    sa.Column('pre_poc_status', sa.String(), nullable=True),
    sa.Column('poc_status', sa.String(), nullable=True),
    sa.Column('post_poc_status', sa.String(), nullable=True),
    sa.Column('server_collected_at', sa.DateTime(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.Column('created_by_id', sa.UUID(), nullable=True),
    sa.ForeignKeyConstraint(['account_owner_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_deployments_customer_name'), 'deployments', ['customer_name'], unique=False)
    
    # config_reports
    op.create_table('config_reports',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('deployment_id', sa.UUID(), nullable=True),
    sa.Column('file_name', sa.String(), nullable=True),
    sa.Column('minio_object_key', sa.String(), nullable=True),
    sa.Column('file_size_bytes', sa.Integer(), nullable=True),
    sa.Column('uploaded_by_id', sa.UUID(), nullable=True),
    sa.Column('uploaded_at', sa.DateTime(), nullable=True),
    sa.Column('expires_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['deployment_id'], ['deployments.id'], ),
    sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('minio_object_key')
    )
    
    # credentials
    op.create_table('credentials',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('deployment_id', sa.UUID(), nullable=True),
    sa.Column('credential_type', sa.String(), nullable=True),
    sa.Column('label', sa.String(), nullable=True),
    sa.Column('encrypted_payload', sa.LargeBinary(), nullable=True),
    sa.Column('created_by_id', sa.UUID(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['deployment_id'], ['deployments.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    
    # deployment_engineers
    op.create_table('deployment_engineers',
    sa.Column('deployment_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('role_type', sa.Enum('lead_engineer', 'assisting_lead', 'field_engineer', name='engineerroletype'), nullable=True),
    sa.Column('assigned_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['deployment_id'], ['deployments.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('deployment_id', 'user_id')
    )
    
    # loaned_items
    op.create_table('loaned_items',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('deployment_id', sa.UUID(), nullable=True),
    sa.Column('item_type', sa.Enum('Server', 'Transceiver', 'UTP', 'Power_Cables', name='itemtype'), nullable=True),
    sa.Column('serial_number', sa.String(), nullable=True),
    sa.Column('status', sa.Enum('loaned', 'returned', 'lost', 'damaged', name='itemstatus'), nullable=True),
    sa.Column('loaned_at', sa.DateTime(), nullable=True),
    sa.Column('returned_at', sa.DateTime(), nullable=True),
    sa.Column('expected_return_date', sa.DateTime(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['deployment_id'], ['deployments.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_loaned_items_serial_number'), 'loaned_items', ['serial_number'], unique=True)
    
    # reminders
    op.create_table('reminders',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('deployment_id', sa.UUID(), nullable=True),
    sa.Column('engineer_id', sa.UUID(), nullable=True),
    sa.Column('trigger_date', sa.DateTime(), nullable=True),
    sa.Column('status', sa.Enum('pending', 'dismissed', 'snoozed', 'completed', name='reminderstatus'), nullable=True),
    sa.Column('snooze_count', sa.Integer(), nullable=True),
    sa.Column('max_snoozes', sa.Integer(), nullable=True),
    sa.Column('reminder_type', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['deployment_id'], ['deployments.id'], ),
    sa.ForeignKeyConstraint(['engineer_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    
    # audit_logs
    op.create_table('audit_logs',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=True),
    sa.Column('action', sa.String(), nullable=True),
    sa.Column('resource_type', sa.String(), nullable=True),
    sa.Column('resource_id', sa.UUID(), nullable=True),
    sa.Column('old_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('new_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('ip_address', sa.String(), nullable=True),
    sa.Column('timestamp', sa.DateTime(), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('reminders')
    op.drop_index(op.f('ix_loaned_items_serial_number'), table_name='loaned_items')
    op.drop_table('loaned_items')
    op.drop_table('deployment_engineers')
    op.drop_table('credentials')
    op.drop_table('config_reports')
    op.drop_index(op.f('ix_deployments_customer_name'), table_name='deployments')
    op.drop_table('deployments')
    op.drop_table('lookup_values')
    op.drop_table('lookup_categories')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_teams_name'), table_name='teams')
    op.drop_table('teams')
    op.drop_index(op.f('ix_roles_name'), table_name='roles')
    op.drop_table('roles')
