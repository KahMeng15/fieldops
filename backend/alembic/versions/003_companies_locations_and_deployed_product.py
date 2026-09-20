"""companies locations and deployed product

Revision ID: 003
Revises: 002
Create Date: 2026-09-20 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Create companies table
    op.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR NOT NULL,
            description TEXT,
            website VARCHAR,
            contact_email VARCHAR,
            contact_phone VARCHAR,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP WITHOUT TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS ix_companies_name ON companies(name);
    """)

    # 2. Create locations table
    op.execute("""
        CREATE TABLE IF NOT EXISTS locations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            address TEXT,
            city VARCHAR,
            country VARCHAR,
            datacenter_tier VARCHAR,
            notes TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP WITHOUT TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS ix_locations_company_id ON locations(company_id);
    """)

    # 3. Add company_id, location_id, deployed_product, deployment_date to deployments
    op.execute("""
        ALTER TABLE deployments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
        ALTER TABLE deployments ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
        ALTER TABLE deployments ADD COLUMN IF NOT EXISTS deployed_product VARCHAR;
        ALTER TABLE deployments ADD COLUMN IF NOT EXISTS deployment_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    """)

    # 4. Migrate existing data from customer_name and location into companies & locations
    op.execute("""
        DO $$
        DECLARE
            rec RECORD;
            comp_id UUID;
            loc_id UUID;
        BEGIN
            FOR rec IN 
                SELECT DISTINCT customer_name, location 
                FROM deployments 
                WHERE customer_name IS NOT NULL AND customer_name != ''
            LOOP
                -- Find or create company
                SELECT id INTO comp_id FROM companies WHERE LOWER(name) = LOWER(rec.customer_name) LIMIT 1;
                IF comp_id IS NULL THEN
                    INSERT INTO companies (name, description) 
                    VALUES (rec.customer_name, 'Migrated customer company') 
                    RETURNING id INTO comp_id;
                END IF;

                -- Find or create location
                IF rec.location IS NOT NULL AND rec.location != '' THEN
                    SELECT id INTO loc_id FROM locations WHERE company_id = comp_id AND LOWER(name) = LOWER(rec.location) LIMIT 1;
                    IF loc_id IS NULL THEN
                        INSERT INTO locations (company_id, name, notes)
                        VALUES (comp_id, rec.location, 'Primary datacenter location')
                        RETURNING id INTO loc_id;
                    END IF;
                ELSE
                    loc_id := NULL;
                END IF;

                -- Link deployments
                UPDATE deployments 
                SET company_id = comp_id, 
                    location_id = loc_id,
                    deployed_product = COALESCE(deployed_product, 'FieldOps Core Gateway'),
                    deployment_date = COALESCE(deployment_date, created_at, CURRENT_TIMESTAMP)
                WHERE customer_name = rec.customer_name 
                  AND (location = rec.location OR (location IS NULL AND rec.location IS NULL));
            END LOOP;
        END $$;
    """)

def downgrade() -> None:
    pass
