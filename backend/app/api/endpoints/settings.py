import json
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.models import (
    LookupCategory, LookupValue, AuditLog, User, 
    DeploymentExtraItem, DeploymentPhaseRemark, CredentialVersion, 
    Credential, ConfigReport, Reminder, LoanedItem, DeploymentEngineer, Deployment,
    Company, Location, CompanyContact
)
from app.core.security import verify_password
from app.api.deps import get_current_user
from typing import Dict, Any, List

router = APIRouter()

DEFAULT_DEPLOYMENT_SETTINGS: Dict[str, Any] = {
    "fields": [
        {
            "key": "deployed_product",
            "label": "Deployed Product",
            "type": "select",
            "enabled": True,
            "required": True,
            "default_value": "FieldOps Core Gateway",
            "options": [
                "FieldOps Core Gateway",
                "Edge Compute Appliance X1",
                "Secure Access Service Edge (SASE)",
                "AI Inference Node Enterprise",
                "Zero Trust Network Connector"
            ],
            "allow_other": True,
            "other_placeholder": "Specify other product...",
            "system_fixed": False,
            "description": "Product, software suite, or hardware appliance deployed"
        },
        {
            "key": "deployment_type",
            "label": "Deployment Type",
            "type": "select",
            "enabled": True,
            "required": False,
            "default_value": "Deployment",
            "options": ["Deployment", "POC", "Pilot", "Trial", "Staging"],
            "allow_other": True,
            "other_placeholder": "Specify other deployment type...",
            "system_fixed": False,
            "description": "Classification of the deployment lifecycle"
        },
        {
            "key": "internal_group_name",
            "label": "Internal Group",
            "type": "select",
            "enabled": True,
            "required": False,
            "default_value": "Edge Infrastructure",
            "options": ["Edge Infrastructure", "Core Platform", "Cloud Ops", "Security Team", "Hardware Lab"],
            "allow_other": True,
            "other_placeholder": "Specify other internal group...",
            "system_fixed": False,
            "description": "Internal engineering team or department owner"
        },
        {
            "key": "pre_poc_status",
            "label": "Status",
            "type": "select",
            "enabled": True,
            "required": False,
            "default_value": "Planning",
            "options": ["Cancelled", "Planning", "Pre-POC", "In Progress", "On Hold", "Completed"],
            "allow_other": False,
            "system_fixed": False,
            "description": "Current progress or phase of the deployment"
        },
        {
            "key": "account_owner",
            "label": "Account Owner",
            "type": "select",
            "enabled": True,
            "required": False,
            "default_value": "",
            "options": [
                "Sarah Jenkins (Account Lead)",
                "Alex Rivera (Customer Success)",
                "Marcus Vance (Enterprise Sales)",
                "Elena Rostova (Client Executive)"
            ],
            "allow_other": True,
            "other_placeholder": "Type to add new owner...",
            "system_fixed": False,
            "description": "Primary sales account manager, customer success lead, or client executive"
        },
        {
            "key": "lead_engineer",
            "label": "Lead Engineer",
            "type": "select",
            "enabled": True,
            "required": False,
            "default_value": "",
            "options": [
                "Michael Chang (Principal Engineer)",
                "David Kim (Senior Systems Architect)",
                "Priya Patel (Lead Field Engineer)",
                "James Wilson (Deployment Lead)",
                "Sarah Miller (Field Specialist)",
                "Rachel Adams (Network Engineer)",
                "Liam O'Connor (Infrastructure Tech)"
            ],
            "allow_other": True,
            "other_placeholder": "Type to add new lead...",
            "system_fixed": False,
            "description": "Primary field or deployment engineer leading implementation"
        },
        {
            "key": "assisting_engineers",
            "label": "Assisting Engineer(s)",
            "type": "multiselect",
            "enabled": True,
            "required": False,
            "default_value": "",
            "options": [
                "Michael Chang (Principal Engineer)",
                "David Kim (Senior Systems Architect)",
                "Priya Patel (Lead Field Engineer)",
                "James Wilson (Deployment Lead)",
                "Sarah Miller (Field Specialist)",
                "Rachel Adams (Network Engineer)",
                "Liam O'Connor (Infrastructure Tech)"
            ],
            "allow_other": True,
            "other_placeholder": "Type to add engineers...",
            "system_fixed": False,
            "description": "Secondary or assisting field engineers on site or remote"
        },
        {
            "key": "deployment_date",
            "label": "Deployment Date",
            "type": "date",
            "enabled": True,
            "required": False,
            "default_value": "",
            "system_fixed": False,
            "description": "Scheduled or initiated installation date"
        },
        {
            "key": "extra_item_options",
            "label": "Extra Items / Hardware Accessories",
            "type": "select",
            "enabled": True,
            "required": False,
            "default_value": "",
            "options": [
                "10G SFP+ SR Transceiver Module",
                "10G SFP+ LR Transceiver Module",
                "1G SFP RJ45 Copper Transceiver Module",
                "DAC 10G Passive Direct Attach Cable (1m)",
                "DAC 10G Passive Direct Attach Cable (3m)",
                "Fiber Patch Cord LC-LC Duplex OM4 (5m)",
                "Cat6A Shielded Ethernet Cable (3m)",
                "Cat6A Shielded Ethernet Cable (10m)",
                "Rack Mount Rail Kit 1U",
                "Dual AC Power Supply Module 550W"
            ],
            "allow_other": True,
            "other_placeholder": "Type custom extra item...",
            "system_fixed": False,
            "description": "Predefined extra accessories, transceivers, cables, and hardware equipment"
        },
        {
            "key": "deployment_folder",
            "label": "Deployment Folder",
            "type": "text",
            "enabled": True,
            "required": False,
            "default_value": "",
            "system_fixed": False,
            "description": "OneDrive or cloud documentation directory URL"
        },
        {
            "key": "notes",
            "label": "Notes & Technical Specs",
            "type": "textarea",
            "enabled": True,
            "required": False,
            "default_value": "",
            "system_fixed": False,
            "description": "Hardware requirements, networking, or additional context"
        }
    ],
    "custom_fields": []
}

DEFAULT_COMPANY_SETTINGS: Dict[str, Any] = {
    "fields": [
        # Company Profile
        {
            "key": "name",
            "label": "Company Name",
            "type": "text",
            "category": "profile",
            "enabled": True,
            "required": True,
            "default_value": "",
            "system_fixed": True,
            "description": "Primary registered organization or client name"
        },
        {
            "key": "description",
            "label": "Company Description",
            "type": "textarea",
            "category": "profile",
            "enabled": True,
            "required": False,
            "default_value": "",
            "system_fixed": False,
            "description": "General overview of the client business, operations, or industry"
        },
        {
            "key": "website",
            "label": "Website URL",
            "type": "text",
            "category": "profile",
            "enabled": True,
            "required": False,
            "default_value": "",
            "system_fixed": False,
            "description": "Official corporate website link (e.g. https://example.com)"
        },
        {
            "key": "contact_email",
            "label": "Contact Email",
            "type": "text",
            "category": "profile",
            "enabled": True,
            "required": False,
            "default_value": "",
            "system_fixed": False,
            "description": "Primary corporate or general communication email"
        },
        {
            "key": "contact_phone",
            "label": "Contact Phone",
            "type": "text",
            "category": "profile",
            "enabled": True,
            "required": False,
            "default_value": "",
            "system_fixed": False,
            "description": "Corporate switchboard or primary office phone"
        },
        # Company Location
        {
            "key": "location_name",
            "label": "Location / Site Name",
            "type": "text",
            "category": "location",
            "enabled": True,
            "required": True,
            "default_value": "",
            "system_fixed": True,
            "description": "Datacenter, office campus, or facility name"
        },
        {
            "key": "address",
            "label": "Street Address",
            "type": "textarea",
            "category": "location",
            "enabled": True,
            "required": False,
            "default_value": "",
            "system_fixed": False,
            "description": "Physical street address of the datacenter or building"
        },
        {
            "key": "district",
            "label": "City / District",
            "type": "select",
            "category": "location",
            "enabled": True,
            "required": False,
            "default_value": "",
            "options": [],
            "allow_other": False,
            "system_fixed": False,
            "description": "City or district"
        },
        {
            "key": "state",
            "label": "State",
            "type": "select",
            "category": "location",
            "enabled": True,
            "required": False,
            "default_value": "",
            "options": [],
            "allow_other": False,
            "system_fixed": False,
            "description": "Malaysian state"
        },

        {
            "key": "location_notes",
            "label": "Location Notes",
            "type": "textarea",
            "category": "location",
            "enabled": True,
            "required": False,
            "default_value": "",
            "system_fixed": False,
            "description": "Access protocols, security badge info, loading dock, power specs"
        },
        # Company Contact
        {
            "key": "contact_name",
            "label": "Contact Person Name",
            "type": "text",
            "category": "contact",
            "enabled": True,
            "required": True,
            "default_value": "",
            "system_fixed": True,
            "description": "Full name of the company representative"
        },
        {
            "key": "position",
            "label": "Job Title / Position",
            "type": "text",
            "category": "contact",
            "enabled": True,
            "required": False,
            "default_value": "",
            "system_fixed": False,
            "description": "Job title or departmental role (e.g. IT Director, SecOps Lead)"
        },
        {
            "key": "contact_person_email",
            "label": "Direct Email",
            "type": "text",
            "category": "contact",
            "enabled": True,
            "required": False,
            "default_value": "",
            "system_fixed": False,
            "description": "Direct individual email address"
        },
        {
            "key": "contact_person_phone",
            "label": "Direct Phone / Mobile",
            "type": "text",
            "category": "contact",
            "enabled": True,
            "required": False,
            "default_value": "",
            "system_fixed": False,
            "description": "Direct phone extension or mobile number"
        },
        {
            "key": "contact_notes",
            "label": "Contact Notes",
            "type": "textarea",
            "category": "contact",
            "enabled": True,
            "required": False,
            "default_value": "",
            "system_fixed": False,
            "description": "Availability, timezone, escalation role"
        }
    ],
    "custom_fields": []
}

import re
from sqlalchemy import text, Column, String
from app.models import Deployment, Company

def sync_company_database_columns(db: Session, settings_data: Dict[str, Any]):
    """Ensure every profile field key in settings exists as a column in PostgreSQL table companies."""
    try:
        existing_cols_res = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'companies'"))
        existing_cols = {row[0] for row in existing_cols_res}
    except Exception:
        existing_cols = set()

    fields = settings_data.get("fields", [])
    for field in fields:
        if field.get("category") == "profile" or not field.get("category"):
            col_name = field.get("key", "").strip()
            if col_name and re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', col_name):
                if col_name not in existing_cols:
                    try:
                        db.execute(text(f'ALTER TABLE companies ADD COLUMN IF NOT EXISTS "{col_name}" VARCHAR;'))
                        db.commit()
                        existing_cols.add(col_name)
                    except Exception as e:
                        db.rollback()
                        print(f"Failed to ensure column {col_name} on companies: {e}")
                if not hasattr(Company, col_name):
                    setattr(Company, col_name, Column(String))

def sync_database_columns(db: Session, settings_data: Dict[str, Any]):
    """Ensure every field key in settings exists as an actual column in PostgreSQL table deployments and on SQLAlchemy model."""
    try:
        existing_cols_res = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'deployments'"))
        existing_cols = {row[0] for row in existing_cols_res}
    except Exception:
        existing_cols = set()

    fields = settings_data.get("fields", [])
    for field in fields:
        col_name = field.get("key", "").strip()
        if col_name and re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', col_name):
            if col_name not in existing_cols:
                try:
                    db.execute(text(f'ALTER TABLE deployments ADD COLUMN IF NOT EXISTS "{col_name}" VARCHAR;'))
                    db.commit()
                    existing_cols.add(col_name)
                except Exception as e:
                    db.rollback()
                    print(f"Failed to ensure column {col_name}: {e}")
            if not hasattr(Deployment, col_name):
                setattr(Deployment, col_name, Column(String))

def sync_engineer_options(fields: List[Dict[str, Any]]):
    """Ensure lead_engineer and assisting_engineers share the exact same merged list of engineer options."""
    lead_f = next((f for f in fields if f.get("key") == "lead_engineer"), None)
    assist_f = next((f for f in fields if f.get("key") == "assisting_engineers"), None)
    
    if lead_f or assist_f:
        lead_opts = (lead_f.get("options", []) if lead_f else []) or []
        assist_opts = (assist_f.get("options", []) if assist_f else []) or []
        
        combined = []
        for opt in (lead_opts + assist_opts):
            if opt and opt not in combined:
                combined.append(opt)
        
        if lead_f:
            lead_f["options"] = list(combined)
        if assist_f:
            assist_f["options"] = list(combined)

def sync_lookup_values(db: Session, settings_data: Dict[str, Any]):
    """Sync select & multiselect options into lookup_categories and lookup_values tables."""
    fields = settings_data.get("fields", [])
    sync_engineer_options(fields)

    for field in fields:
        field_key = field.get("key")
        options = field.get("options")
        if field.get("type") in ["select", "multiselect"] and options:
            cat_name = f"field_{field_key}"
            category = db.query(LookupCategory).filter_by(name=cat_name).first()
            if not category:
                category = LookupCategory(name=cat_name, description=field.get("label", ""))
                db.add(category)
                db.commit()
                db.refresh(category)
            
            # Deactivate or remove existing
            db.query(LookupValue).filter_by(category_id=category.id).delete()
            for idx, opt in enumerate(options):
                lv = LookupValue(
                    category_id=category.id,
                    value=opt,
                    display_order=idx,
                    is_active=True
                )
                db.add(lv)
            db.commit()

@router.get("/deployment-fields")
async def get_deployment_field_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    setting_cat = db.query(LookupCategory).filter_by(name="deployment_field_settings").first()
    if not setting_cat or not setting_cat.description:
        # First time, seed default settings
        sync_engineer_options(DEFAULT_DEPLOYMENT_SETTINGS.get("fields", []))
        setting_cat = LookupCategory(
            name="deployment_field_settings",
            description=json.dumps(DEFAULT_DEPLOYMENT_SETTINGS)
        )
        db.add(setting_cat)
        db.commit()
        sync_lookup_values(db, DEFAULT_DEPLOYMENT_SETTINGS)
        sync_database_columns(db, DEFAULT_DEPLOYMENT_SETTINGS)
        return DEFAULT_DEPLOYMENT_SETTINGS

    try:
        data = json.loads(setting_cat.description)
        # Strip legacy customer_name and location fields from customizable list
        data["fields"] = [f for f in data.get("fields", []) if f.get("key") not in ["customer_name", "location"]]
        
        # Sync field types and options from default settings
        default_options_map = {f["key"]: f.get("options", []) for f in DEFAULT_DEPLOYMENT_SETTINGS.get("fields", []) if f.get("options")}
        default_type_map = {f["key"]: f.get("type") for f in DEFAULT_DEPLOYMENT_SETTINGS.get("fields", []) if f.get("type")}
        updated_any = False
        
        for f in data.get("fields", []):
            k = f.get("key")
            # Upgrade field types if updated in system defaults
            if k in default_type_map and f.get("type") != default_type_map[k]:
                f["type"] = default_type_map[k]
                updated_any = True
            # Backfill default options if options are empty
            if k in default_options_map and not f.get("options"):
                f["options"] = default_options_map[k]
                updated_any = True

        # Synchronize engineer options across lead and assisting engineers
        sync_engineer_options(data.get("fields", []))

        # Ensure any newly added default fields are present
        existing_keys = {f.get("key") for f in data.get("fields", [])}
        missing_defaults = [f for f in DEFAULT_DEPLOYMENT_SETTINGS.get("fields", []) if f.get("key") not in existing_keys]
        if missing_defaults or updated_any:
            if missing_defaults:
                data["fields"].extend(missing_defaults)
            setting_cat.description = json.dumps(data)
            db.commit()
            sync_database_columns(db, data)
        return data
    except Exception:
        return DEFAULT_DEPLOYMENT_SETTINGS

@router.put("/deployment-fields")
async def update_deployment_field_settings(
    request: Request,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check permissions: user must be admin or have admin/create_deployment permissions
    user_role_name = current_user.role.name if current_user.role else ""
    user_perms = current_user.role.permissions if current_user.role else []
    if user_role_name != "admin" and not any(p in user_perms for p in ["manage_settings", "create_deployment"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify admin settings."
        )

    # Validate payload has 'fields'
    if "fields" not in payload or not isinstance(payload["fields"], list):
        raise HTTPException(status_code=400, detail="Invalid payload: 'fields' list required.")

    # Merge engineer options so lead and assisting engineers share the exact same pool
    sync_engineer_options(payload.get("fields", []))

    setting_cat = db.query(LookupCategory).filter_by(name="deployment_field_settings").first()
    old_value = json.loads(setting_cat.description) if setting_cat and setting_cat.description else None

    if not setting_cat:
        setting_cat = LookupCategory(
            name="deployment_field_settings",
            description=json.dumps(payload)
        )
        db.add(setting_cat)
    else:
        setting_cat.description = json.dumps(payload)

    db.commit()
    db.refresh(setting_cat)

    # Sync lookup values & PostgreSQL database columns
    sync_lookup_values(db, payload)
    sync_database_columns(db, payload)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="update_deployment_field_settings",
        resource_type="settings",
        resource_id=setting_cat.id,
        old_value=old_value,
        new_value=payload,
        ip_address=request.client.host if request.client else "127.0.0.1",
        notes=f"Updated deployment fields configuration by {current_user.username}"
    )
    db.add(audit)
    db.commit()

    return payload

@router.post("/deployment-fields/reset")
async def reset_deployment_field_settings(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_role_name = current_user.role.name if current_user.role else ""
    if user_role_name != "admin":
        raise HTTPException(status_code=403, detail="Only admins can reset settings.")

    setting_cat = db.query(LookupCategory).filter_by(name="deployment_field_settings").first()
    if setting_cat:
        setting_cat.description = json.dumps(DEFAULT_DEPLOYMENT_SETTINGS)
        db.commit()

    sync_lookup_values(db, DEFAULT_DEPLOYMENT_SETTINGS)
    sync_database_columns(db, DEFAULT_DEPLOYMENT_SETTINGS)
    return DEFAULT_DEPLOYMENT_SETTINGS

@router.get("/company-fields")
async def get_company_field_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    setting_cat = db.query(LookupCategory).filter_by(name="company_field_settings").first()
    if not setting_cat or not setting_cat.description:
        # First time, seed default company settings
        setting_cat = LookupCategory(
            name="company_field_settings",
            description=json.dumps(DEFAULT_COMPANY_SETTINGS)
        )
        db.add(setting_cat)
        db.commit()
        sync_lookup_values(db, DEFAULT_COMPANY_SETTINGS)
        sync_company_database_columns(db, DEFAULT_COMPANY_SETTINGS)
        return DEFAULT_COMPANY_SETTINGS

    try:
        data = json.loads(setting_cat.description)
        existing_keys = {f.get("key") for f in data.get("fields", [])}
        missing_defaults = [f for f in DEFAULT_COMPANY_SETTINGS.get("fields", []) if f.get("key") not in existing_keys]
        if missing_defaults:
            data["fields"].extend(missing_defaults)
            setting_cat.description = json.dumps(data)
            db.commit()
            sync_company_database_columns(db, data)
        return data
    except Exception:
        return DEFAULT_COMPANY_SETTINGS

@router.put("/company-fields")
async def update_company_field_settings(
    request: Request,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_role_name = current_user.role.name if current_user.role else ""
    user_perms = current_user.role.permissions if current_user.role else []
    if user_role_name != "admin" and not any(p in user_perms for p in ["manage_settings", "create_deployment"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify admin settings."
        )

    if "fields" not in payload or not isinstance(payload["fields"], list):
        raise HTTPException(status_code=400, detail="Invalid payload: 'fields' list required.")

    setting_cat = db.query(LookupCategory).filter_by(name="company_field_settings").first()
    old_value = json.loads(setting_cat.description) if setting_cat and setting_cat.description else None

    if not setting_cat:
        setting_cat = LookupCategory(
            name="company_field_settings",
            description=json.dumps(payload)
        )
        db.add(setting_cat)
    else:
        setting_cat.description = json.dumps(payload)

    db.commit()
    db.refresh(setting_cat)

    sync_lookup_values(db, payload)
    sync_company_database_columns(db, payload)

    audit = AuditLog(
        user_id=current_user.id,
        action="update_company_field_settings",
        resource_type="settings",
        resource_id=setting_cat.id,
        old_value=old_value,
        new_value=payload,
        ip_address=request.client.host if request.client else "127.0.0.1",
        notes=f"Updated company fields configuration by {current_user.username}"
    )
    db.add(audit)
    db.commit()

    return payload

@router.post("/company-fields/reset")
async def reset_company_field_settings(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_role_name = current_user.role.name if current_user.role else ""
    if user_role_name != "admin":
        raise HTTPException(status_code=403, detail="Only admins can reset settings.")

    setting_cat = db.query(LookupCategory).filter_by(name="company_field_settings").first()
    if setting_cat:
        setting_cat.description = json.dumps(DEFAULT_COMPANY_SETTINGS)
        db.commit()

    sync_lookup_values(db, DEFAULT_COMPANY_SETTINGS)
    sync_company_database_columns(db, DEFAULT_COMPANY_SETTINGS)
    return DEFAULT_COMPANY_SETTINGS

DEFAULT_REGION_SETTINGS = [
    {"state": "Johor", "districts": ["Johor Bahru", "Batu Pahat", "Kluang"]},
    {"state": "Kedah", "districts": ["Alor Setar", "Sungai Petani", "Kulim"]},
    {"state": "Kelantan", "districts": ["Kota Bharu", "Pasir Mas", "Tanah Merah"]},
    {"state": "Kuala Lumpur", "districts": ["Kuala Lumpur", "Cheras", "Kepong"]},
    {"state": "Melaka", "districts": ["Melaka City", "Alor Gajah", "Jasin"]},
    {"state": "Negeri Sembilan", "districts": ["Seremban", "Port Dickson", "Nilai"]},
    {"state": "Pahang", "districts": ["Kuantan", "Temerloh", "Bentong"]},
    {"state": "Penang", "districts": ["George Town", "Butterworth", "Bayan Lepas"]},
    {"state": "Perak", "districts": ["Ipoh", "Taiping", "Teluk Intan"]},
    {"state": "Perlis", "districts": ["Kangar", "Arau"]},
    {"state": "Putrajaya", "districts": ["Putrajaya"]},
    {"state": "Sabah", "districts": ["Kota Kinabalu", "Sandakan", "Tawau"]},
    {"state": "Sarawak", "districts": ["Kuching", "Miri", "Sibu"]},
    {"state": "Selangor", "districts": ["Shah Alam", "Petaling Jaya", "Subang Jaya", "Klang"]},
    {"state": "Terengganu", "districts": ["Kuala Terengganu", "Kemaman", "Dungun"]}
]

@router.get("/states-districts")
async def get_region_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    setting_cat = db.query(LookupCategory).filter_by(name="region_settings").first()
    if not setting_cat or not setting_cat.description:
        setting_cat = LookupCategory(
            name="region_settings",
            description=json.dumps(DEFAULT_REGION_SETTINGS)
        )
        db.add(setting_cat)
        db.commit()
        return DEFAULT_REGION_SETTINGS
    try:
        return json.loads(setting_cat.description)
    except Exception:
        return DEFAULT_REGION_SETTINGS

@router.put("/states-districts")
async def update_region_settings(
    request: Request,
    payload: List[Dict[str, Any]],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_role_name = current_user.role.name if current_user.role else ""
    if user_role_name != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can modify region settings."
        )

    setting_cat = db.query(LookupCategory).filter_by(name="region_settings").first()
    if not setting_cat:
        setting_cat = LookupCategory(
            name="region_settings",
            description=json.dumps(payload)
        )
        db.add(setting_cat)
    else:
        setting_cat.description = json.dumps(payload)

    db.commit()
    return payload


class ResetDatabaseSchema(BaseModel):
    password: str


@router.post("/reset-database")
async def reset_database(
    payload: ResetDatabaseSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_role_name = current_user.role.name if current_user.role else ""
    if user_role_name != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can reset the database."
        )

    is_valid_password = verify_password(payload.password, current_user.password_hash) if current_user.password_hash else False
    if not is_valid_password:
        admin_user = db.query(User).filter_by(username="admin").first()
        if admin_user and admin_user.password_hash:
            is_valid_password = verify_password(payload.password, admin_user.password_hash)

    if not is_valid_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid admin password. Database reset authorization failed."
        )

    try:
        # 1. Delete all operational data records (deployments, companies, locations, credentials, etc.)
        db.query(DeploymentExtraItem).delete()
        db.query(DeploymentPhaseRemark).delete()
        db.query(CredentialVersion).delete()
        db.query(Credential).delete()
        db.query(ConfigReport).delete()
        db.query(Reminder).delete()
        db.query(LoanedItem).delete()
        db.query(DeploymentEngineer).delete()
        db.query(Deployment).delete()
        db.query(Location).delete()
        db.query(CompanyContact).delete()
        db.query(Company).delete()
        db.query(AuditLog).delete()

        # 2. Delete all lookup values and categories (wiping custom options for internal_group, deployed_product, account_owner, engineers, extra_items, etc.)
        db.query(LookupValue).delete()
        db.query(LookupCategory).delete()
        db.commit()

        # 3. Re-create default settings categories
        dep_cat = LookupCategory(name="deployment_field_settings", description=json.dumps(DEFAULT_DEPLOYMENT_SETTINGS))
        db.add(dep_cat)

        comp_cat = LookupCategory(name="company_field_settings", description=json.dumps(DEFAULT_COMPANY_SETTINGS))
        db.add(comp_cat)

        reg_cat = LookupCategory(name="region_settings", description=json.dumps(DEFAULT_REGION_SETTINGS))
        db.add(reg_cat)

        db.commit()

        # 4. Sync lookups & database table columns to clean system defaults
        sync_lookup_values(db, DEFAULT_DEPLOYMENT_SETTINGS)
        sync_database_columns(db, DEFAULT_DEPLOYMENT_SETTINGS)

        sync_lookup_values(db, DEFAULT_COMPANY_SETTINGS)
        sync_company_database_columns(db, DEFAULT_COMPANY_SETTINGS)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset database: {str(e)}"
        )

    return {"message": "Database successfully reset and reinitialized to default system configuration."}

