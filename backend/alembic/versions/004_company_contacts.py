"""create company_contacts table

Revision ID: 004
Revises: 003
Create Date: 2026-09-20 19:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS company_contacts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            email VARCHAR,
            phone VARCHAR,
            position VARCHAR,
            notes TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP WITHOUT TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS ix_company_contacts_company_id ON company_contacts(company_id);
    """)

    # Migrate any existing company contact info into company_contacts table
    op.execute("""
        INSERT INTO company_contacts (id, company_id, name, email, phone, position, notes, created_at, updated_at)
        SELECT 
            gen_random_uuid(),
            id,
            'Primary Contact',
            contact_email,
            contact_phone,
            'Technical & Operations Contact',
            'Migrated from company profile',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM companies
        WHERE ((contact_email IS NOT NULL AND contact_email != '') OR (contact_phone IS NOT NULL AND contact_phone != ''))
          AND id NOT IN (SELECT company_id FROM company_contacts);
    """)

def downgrade() -> None:
    op.drop_table('company_contacts')
