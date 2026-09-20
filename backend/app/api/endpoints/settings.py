import json
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.models import LookupCategory, LookupValue, AuditLog, User
from app.api.deps import get_current_user
from typing import Dict, Any, List

router = APIRouter()

DEFAULT_DEPLOYMENT_SETTINGS: Dict[str, Any] = {
    "fields": [
        {
            "key": "customer_name",
            "label": "Customer / Organization Name",
            "type": "text",
            "enabled": True,
            "required": True,
            "default_value": "",
            "system_fixed": True,
            "description": "Primary customer or client organization name"
        },
        {
            "key": "location",
            "label": "Location / Datacenter",
            "type": "text",
            "enabled": True,
            "required": True,
            "default_value": "",
            "system_fixed": False,
            "description": "Physical datacenter, region, or facility identifier"
        },
        {
            "key": "deployment_type",
            "label": "Deployment Type",
            "type": "select",
            "enabled": True,
            "required": False,
            "default_value": "Deployment",
            "options": ["Deployment", "POC", "Pilot", "Trial", "Staging"],
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
            "options": ["Planning", "Pre-POC", "In Progress", "Staging", "Active", "Completed", "On Hold", "Cancelled"],
            "system_fixed": False,
            "description": "Current progress or phase of the deployment"
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

def sync_lookup_values(db: Session, settings_data: Dict[str, Any]):
    """Sync select options into lookup_categories and lookup_values tables."""
    fields = settings_data.get("fields", [])
    for field in fields:
        field_key = field.get("key")
        options = field.get("options")
        if field.get("type") == "select" and options:
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
        setting_cat = LookupCategory(
            name="deployment_field_settings",
            description=json.dumps(DEFAULT_DEPLOYMENT_SETTINGS)
        )
        db.add(setting_cat)
        db.commit()
        sync_lookup_values(db, DEFAULT_DEPLOYMENT_SETTINGS)
        return DEFAULT_DEPLOYMENT_SETTINGS

    try:
        data = json.loads(setting_cat.description)
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

    # Sync lookup values
    sync_lookup_values(db, payload)

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
    return DEFAULT_DEPLOYMENT_SETTINGS
