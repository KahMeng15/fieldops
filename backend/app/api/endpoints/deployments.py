from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import text, Column, String, func
from app.db.base import get_db
from app.models import Deployment, AuditLog, User, Company, Location, Credential, DeploymentPhaseRemark, DeploymentExtraItem
from app.schemas import DeploymentSchema, DeploymentResponse, PhaseRemarkCreate, PhaseRemarkResponse, ExtraItemCreate, ExtraItemResponse
from app.api.deps import get_current_user, require_permission
from app.core.audit import parse_client_info, resolve_external_ip, is_internal_docker_ip
from typing import List, Optional, Set, Any, Dict
from datetime import datetime
from uuid import UUID

router = APIRouter()

def sync_orm_columns(db: Session) -> Set[str]:
    cols_res = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'deployments'"))
    cols = set()
    for row in cols_res:
        col_name = row[0]
        cols.add(col_name)
        if not hasattr(Deployment, col_name):
            setattr(Deployment, col_name, Column(String))
    return cols

@router.get("", response_model=List[DeploymentResponse])
@router.get("/", response_model=List[DeploymentResponse])
async def list_deployments(
    customer: Optional[str] = None,
    company_id: Optional[UUID] = None,
    location_id: Optional[UUID] = None,
    product: Optional[str] = None,
    status: Optional[str] = None,
    team: Optional[str] = None,
    engineer: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sync_orm_columns(db)
    query = db.query(Deployment).filter(Deployment.deleted_at == None)
    if company_id:
        query = query.filter(Deployment.company_id == company_id)
    if location_id:
        query = query.filter(Deployment.location_id == location_id)
    if product:
        query = query.filter(Deployment.deployed_product.ilike(f"%{product}%"))
    if customer:
        query = query.filter(Deployment.customer_name.ilike(f"%{customer}%"))
    
    return query.order_by(Deployment.deployment_date.desc(), Deployment.created_at.desc()).all()

@router.post("", response_model=DeploymentResponse, status_code=201)
@router.post("/", response_model=DeploymentResponse, status_code=201)
async def create_deployment(
    request: Request,
    data: DeploymentSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(["create_deployment"]))
):
    actual_db_cols = sync_orm_columns(db)
    payload_data = {k: v for k, v in data.dict().items() if k in actual_db_cols}

    # Resolve Company and Location links
    company_id = data.company_id
    location_id = data.location_id
    customer_name = (data.customer_name or "").strip()
    loc_name = (data.location or "").strip()

    if company_id:
        comp = db.query(Company).filter(Company.id == company_id).first()
        if comp:
            customer_name = comp.name
            payload_data["company_id"] = comp.id
            payload_data["customer_name"] = comp.name

    if location_id:
        loc = db.query(Location).filter(Location.id == location_id).first()
        if loc:
            loc_name = loc.name
            payload_data["location_id"] = loc.id
            payload_data["location"] = loc.name
            if not company_id:
                payload_data["company_id"] = loc.company_id
                comp = db.query(Company).filter(Company.id == loc.company_id).first()
                if comp:
                    payload_data["customer_name"] = comp.name
                    customer_name = comp.name

    # Auto-link or create company if missing
    if not payload_data.get("company_id") and customer_name:
        existing_comp = db.query(Company).filter(Company.name.ilike(customer_name), Company.deleted_at == None).first()
        if existing_comp:
            payload_data["company_id"] = existing_comp.id
            payload_data["customer_name"] = existing_comp.name
        else:
            new_comp = Company(name=customer_name, created_by_id=current_user.id)
            db.add(new_comp)
            db.flush()
            payload_data["company_id"] = new_comp.id

    # Auto-link or create location if missing
    if payload_data.get("company_id") and not payload_data.get("location_id") and loc_name:
        existing_loc = db.query(Location).filter(
            Location.company_id == payload_data["company_id"],
            Location.name.ilike(loc_name),
            Location.deleted_at == None
        ).first()
        if existing_loc:
            payload_data["location_id"] = existing_loc.id
            payload_data["location"] = existing_loc.name
        else:
            new_loc = Location(company_id=payload_data["company_id"], name=loc_name, created_by_id=current_user.id)
            db.add(new_loc)
            db.flush()
            payload_data["location_id"] = new_loc.id

    if "pre_poc_status" in payload_data and payload_data["pre_poc_status"]:
        payload_data["status_updated_at"] = datetime.utcnow()
        payload_data["status_updated_by_id"] = current_user.id
        payload_data["status_updated_by_name"] = current_user.username

    deployment = Deployment(**payload_data, created_by_id=current_user.id)
    db.add(deployment)
    db.flush()
    
    client_info = parse_client_info(request)
    audit_log = AuditLog(
        user_id=current_user.id,
        action="create_deployment",
        resource_type="deployment",
        resource_id=deployment.id,
        ip_address=client_info["ip_address"],
        new_value={
            "item_name": deployment.customer_name,
            "product": deployment.deployed_product,
            "status": deployment.pre_poc_status,
            **client_info
        },
        notes=f"Created deployment for {deployment.customer_name}"
    )
    db.add(audit_log)
    db.commit()
    db.refresh(deployment)
    
    return deployment

@router.get("/{id}", response_model=DeploymentResponse)
async def get_deployment(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sync_orm_columns(db)
    deployment = db.query(Deployment).filter(Deployment.id == id, Deployment.deleted_at == None).first()
    if not deployment:
        raise HTTPException(404, "Deployment not found")
    return deployment

@router.patch("/{id}", response_model=DeploymentResponse)
async def update_deployment(
    id: str,
    request: Request,
    data: DeploymentSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    actual_db_cols = sync_orm_columns(db)
    deployment = db.query(Deployment).filter(Deployment.id == id, Deployment.deleted_at == None).first()
    if not deployment:
        raise HTTPException(404, "Deployment not found")
    
    data_dict = data.dict(exclude_unset=True)
    if "pre_poc_status" in data_dict and data_dict["pre_poc_status"] != deployment.pre_poc_status:
        old_phase = deployment.pre_poc_status
        if old_phase:
            db.query(DeploymentPhaseRemark).filter(
                DeploymentPhaseRemark.deployment_id == deployment.id,
                DeploymentPhaseRemark.phase == old_phase
            ).update({"is_archived": True})

    if "pre_poc_status" in data_dict or "poc_status" in data_dict or "post_poc_status" in data_dict:
        deployment.status_updated_at = datetime.utcnow()
        deployment.status_updated_by_id = current_user.id
        deployment.status_updated_by_name = current_user.username

    old_values: Dict[str, Any] = {}
    new_values: Dict[str, Any] = {}
    changes: Dict[str, Any] = {}

    for key, value in data_dict.items():
        if key in actual_db_cols:
            old_val = getattr(deployment, key, None)
            # Serialize dates
            old_val_serial = old_val.isoformat() if hasattr(old_val, "isoformat") else old_val
            new_val_serial = value.isoformat() if hasattr(value, "isoformat") else value

            if str(old_val_serial) != str(new_val_serial):
                old_values[key] = old_val_serial
                new_values[key] = new_val_serial
                changes[key] = {
                    "old": old_val_serial,
                    "new": new_val_serial
                }
            setattr(deployment, key, value)
    
    db.commit()
    db.refresh(deployment)
    
    client_info = parse_client_info(request)
    changed_fields = list(changes.keys())
    note_summary = f"Updated {', '.join(changed_fields[:3])}" if changed_fields else "Updated deployment"
    if len(changed_fields) > 3:
        note_summary += f" and {len(changed_fields) - 3} other fields"

    audit_log = AuditLog(
        user_id=current_user.id,
        action="update_deployment",
        resource_type="deployment",
        resource_id=deployment.id,
        ip_address=client_info["ip_address"],
        old_value=old_values,
        new_value={
            "item_name": deployment.customer_name,
            "changes": changes,
            "values": new_values,
            **client_info
        },
        notes=note_summary
    )
    db.add(audit_log)
    db.commit()
    
    return deployment

@router.delete("/{id}", status_code=204)
async def delete_deployment(
    id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(["delete_deployment"]))
):
    deployment = db.query(Deployment).filter(Deployment.id == id).first()
    if not deployment:
        raise HTTPException(404, "Deployment not found")
    
    deployment.deleted_at = datetime.utcnow()
    db.commit()
    
    client_info = parse_client_info(request)
    audit_log = AuditLog(
        user_id=current_user.id,
        action="delete_deployment",
        resource_type="deployment",
        resource_id=deployment.id,
        ip_address=client_info["ip_address"],
        new_value={
            "item_name": deployment.customer_name,
            **client_info
        },
        notes=f"Deleted deployment {deployment.customer_name}"
    )
    db.add(audit_log)
    db.commit()
    return None

@router.get("/{id}/activity")
async def get_deployment_activity(
    id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns audit trail / activity log of changes made to this deployment.
    """
    deployment = db.query(Deployment).filter(Deployment.id == id).first()
    if not deployment:
        raise HTTPException(404, "Deployment not found")

    current_ext_ip = resolve_external_ip(request)

    logs = (
        db.query(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.id)
        .filter(
            AuditLog.resource_type == "deployment",
            AuditLog.resource_id == UUID(id)
        )
        .order_by(AuditLog.timestamp.desc())
        .limit(100)
        .all()
    )

    need_commit = False
    if not is_internal_docker_ip(current_ext_ip):
        for log, _ in logs:
            if is_internal_docker_ip(log.ip_address):
                log.ip_address = current_ext_ip
                if isinstance(log.new_value, dict):
                    log.new_value["ip_address"] = current_ext_ip
                need_commit = True
        if need_commit:
            db.commit()

    result = []
    for log, user in logs:
        nv = log.new_value if isinstance(log.new_value, dict) else {}
        changes = nv.get("changes") or {}
        
        # Determine human-readable item/action name
        if log.action == "create_deployment":
            item_name = "Deployment Created"
        elif "pre_poc_status" in changes:
            old_st = changes["pre_poc_status"].get("old") or "None"
            new_st = changes["pre_poc_status"].get("new") or "None"
            item_name = f"Status changed from {old_st} to {new_st}"
        elif changes:
            fields = [f.replace("_", " ").title() for f in changes.keys()]
            item_name = f"Updated {', '.join(fields[:3])}"
            if len(fields) > 3:
                item_name += f" (+{len(fields)-3} more)"
        elif log.notes:
            item_name = log.notes
        else:
            item_name = "Deployment Updated"

        display_ip = log.ip_address
        if is_internal_docker_ip(display_ip) and not is_internal_docker_ip(current_ext_ip):
            display_ip = current_ext_ip

        result.append({
            "id": str(log.id),
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "action": log.action,
            "item_name": item_name,
            "user_id": str(log.user_id) if log.user_id else None,
            "user_name": user.username if user else (nv.get("username") or "System"),
            "user_email": getattr(user, "email", None) if user else None,
            "ip_address": display_ip or "127.0.0.1",
            "device_info": nv.get("device") or "macOS / Workstation",
            "browser_info": nv.get("browser") or "Web Browser",
            "user_agent": nv.get("user_agent") or "",
            "changes": changes,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "notes": log.notes
        })

    return result

@router.get("/{id}/credential-access-logs")
async def get_deployment_credential_logs(
    id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns security audit access logs for all credentials linked to this deployment.
    """
    # Fetch all credentials for this deployment
    creds = db.query(Credential).filter(Credential.deployment_id == UUID(id)).all()
    cred_map = {str(c.id): c for c in creds}
    cred_uuids = [c.id for c in creds]

    if not cred_uuids:
        return []

    current_ext_ip = resolve_external_ip(request)

    logs = (
        db.query(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.id)
        .filter(
            AuditLog.resource_type == "credential",
            AuditLog.resource_id.in_(cred_uuids)
        )
        .order_by(AuditLog.timestamp.desc())
        .limit(100)
        .all()
    )

    need_commit = False
    if not is_internal_docker_ip(current_ext_ip):
        for log, _ in logs:
            if is_internal_docker_ip(log.ip_address):
                log.ip_address = current_ext_ip
                if isinstance(log.new_value, dict):
                    log.new_value["ip_address"] = current_ext_ip
                need_commit = True
        if need_commit:
            db.commit()

    result = []
    for log, user in logs:
        nv = log.new_value if isinstance(log.new_value, dict) else {}
        cred_obj = cred_map.get(str(log.resource_id))

        cred_label = (
            (cred_obj.label if cred_obj else None) 
            or nv.get("item_name") 
            or "Access Credential"
        )
        cred_type = (
            (cred_obj.credential_type if cred_obj else None) 
            or nv.get("credential_type") 
            or "web_ui_login"
        )

        action_label = "Revealed Secret"
        if log.action == "reveal_credential":
            action_label = "Revealed / Decrypted Secret"
        elif log.action == "create_credential":
            action_label = "Created Credential"
        elif log.action == "delete_credential":
            action_label = "Deleted Credential"

        display_ip = log.ip_address
        if is_internal_docker_ip(display_ip) and not is_internal_docker_ip(current_ext_ip):
            display_ip = current_ext_ip

        result.append({
            "id": str(log.id),
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "action": log.action,
            "action_label": action_label,
            "item_name": cred_label,
            "credential_type": cred_type,
            "user_id": str(log.user_id) if log.user_id else None,
            "user_name": user.username if user else "System",
            "user_email": getattr(user, "email", None) if user else None,
            "ip_address": display_ip or "127.0.0.1",
            "device_info": nv.get("device") or "macOS / Workstation",
            "browser_info": nv.get("browser") or "Web Browser",
            "user_agent": nv.get("user_agent") or "",
            "notes": log.notes
        })

    return result

@router.get("/{id}/phase-remarks", response_model=List[PhaseRemarkResponse])
async def get_deployment_phase_remarks(
    id: str,
    phase: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(DeploymentPhaseRemark).filter(DeploymentPhaseRemark.deployment_id == id)
    if phase:
        query = query.filter(DeploymentPhaseRemark.phase == phase)
    return query.order_by(DeploymentPhaseRemark.created_at.desc()).all()

@router.post("/{id}/phase-remarks", response_model=PhaseRemarkResponse, status_code=201)
async def create_deployment_phase_remark(
    id: str,
    data: PhaseRemarkCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deployment = db.query(Deployment).filter(Deployment.id == id, Deployment.deleted_at == None).first()
    if not deployment:
        raise HTTPException(404, "Deployment not found")

    # Discard existing active remark for this phase to archive
    existing_active = db.query(DeploymentPhaseRemark).filter(
        DeploymentPhaseRemark.deployment_id == deployment.id,
        DeploymentPhaseRemark.phase == data.phase,
        DeploymentPhaseRemark.is_archived == False
    ).order_by(DeploymentPhaseRemark.created_at.desc()).all()

    old_remark_text = existing_active[0].remark if existing_active else None
    for prev_remark in existing_active:
        prev_remark.is_archived = True

    new_text = data.remark.strip()
    remark_entry = DeploymentPhaseRemark(
        deployment_id=deployment.id,
        phase=data.phase,
        remark=new_text,
        author_id=current_user.id,
        author_name=current_user.username,
        is_archived=False
    )
    db.add(remark_entry)
    db.commit()
    db.refresh(remark_entry)

    client_info = parse_client_info(request)
    audit_log = AuditLog(
        user_id=current_user.id,
        action="update_phase_remark" if old_remark_text else "add_phase_remark",
        resource_type="deployment",
        resource_id=deployment.id,
        ip_address=client_info["ip_address"],
        old_value={"remark": old_remark_text} if old_remark_text else None,
        new_value={
            "item_name": deployment.customer_name,
            "phase": data.phase,
            "remark": new_text,
            "author_name": current_user.username,
            **client_info
        },
        notes=f"Updated notepad remark for stage '{data.phase}' on {deployment.customer_name} (previous version archived)" if old_remark_text else f"Added remark for stage '{data.phase}' on {deployment.customer_name}"
    )
    db.add(audit_log)
    db.commit()

    return remark_entry

# Extra Items / Hardware Accessories Endpoints
@router.get("/{id}/extra-items", response_model=List[ExtraItemResponse])
async def get_deployment_extra_items(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(DeploymentExtraItem).filter(DeploymentExtraItem.deployment_id == id).order_by(DeploymentExtraItem.created_at.asc()).all()

@router.post("/{id}/extra-items", response_model=ExtraItemResponse, status_code=201)
async def create_deployment_extra_item(
    id: str,
    data: ExtraItemCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deployment = db.query(Deployment).filter(Deployment.id == id, Deployment.deleted_at == None).first()
    if not deployment:
        raise HTTPException(404, "Deployment not found")

    item = DeploymentExtraItem(
        deployment_id=deployment.id,
        item_name=data.item_name.strip(),
        quantity=max(1, data.quantity),
        notes=data.notes.strip() if data.notes else None
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    client_info = parse_client_info(request)
    audit_log = AuditLog(
        user_id=current_user.id,
        action="create_extra_item",
        resource_type="deployment",
        resource_id=deployment.id,
        ip_address=client_info["ip_address"],
        new_value={
            "item_name": item.item_name,
            "quantity": item.quantity,
            "customer_name": deployment.customer_name,
            **client_info
        },
        notes=f"Added extra item '{item.item_name}' (Qty: {item.quantity}) to deployment {deployment.customer_name}"
    )
    db.add(audit_log)
    db.commit()

    return item

@router.put("/{id}/extra-items/{item_id}", response_model=ExtraItemResponse)
async def update_deployment_extra_item(
    id: str,
    item_id: str,
    data: ExtraItemCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(DeploymentExtraItem).filter(
        DeploymentExtraItem.id == item_id,
        DeploymentExtraItem.deployment_id == id
    ).first()
    if not item:
        raise HTTPException(404, "Extra item not found")

    old_val = {"item_name": item.item_name, "quantity": item.quantity}
    item.item_name = data.item_name.strip()
    item.quantity = max(1, data.quantity)
    if data.notes is not None:
        item.notes = data.notes.strip() if data.notes else None
    
    db.commit()
    db.refresh(item)

    client_info = parse_client_info(request)
    audit_log = AuditLog(
        user_id=current_user.id,
        action="update_extra_item",
        resource_type="deployment",
        resource_id=UUID(id),
        ip_address=client_info["ip_address"],
        old_value=old_val,
        new_value={"item_name": item.item_name, "quantity": item.quantity, **client_info},
        notes=f"Updated extra item '{item.item_name}' (Qty: {item.quantity})"
    )
    db.add(audit_log)
    db.commit()

    return item

@router.delete("/{id}/extra-items/{item_id}", status_code=204)
async def delete_deployment_extra_item(
    id: str,
    item_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(DeploymentExtraItem).filter(
        DeploymentExtraItem.id == item_id,
        DeploymentExtraItem.deployment_id == id
    ).first()
    if not item:
        raise HTTPException(404, "Extra item not found")

    client_info = parse_client_info(request)
    audit_log = AuditLog(
        user_id=current_user.id,
        action="delete_extra_item",
        resource_type="deployment",
        resource_id=UUID(id),
        ip_address=client_info["ip_address"],
        old_value={"item_name": item.item_name, "quantity": item.quantity},
        notes=f"Deleted extra item '{item.item_name}'"
    )
    db.add(audit_log)
    db.delete(item)
    db.commit()

    return None


# Excel Import Preview & Execution Endpoints
FIELD_DEFINITIONS = [
    {"key": "customer_name", "label": "Customer Name", "required": True},
    {"key": "account_owner", "label": "Account Owner / Sales Person", "required": False},
    {"key": "deployment_type", "label": "Deployment Type (POC / Deployment)", "required": False},
    {"key": "product_1", "label": "Product 1 Name", "required": False},
    {"key": "product_1_qty", "label": "Product 1 Quantity", "required": False},
    {"key": "product_2", "label": "Product 2 Name (Creates 2nd Deployment)", "required": False},
    {"key": "product_2_qty", "label": "Product 2 Quantity", "required": False},
    {"key": "deployment_date", "label": "Start / Received Date", "required": False},
    {"key": "kickoff_date", "label": "Kick-Off Date", "required": False},
    {"key": "end_date", "label": "End / Target Date", "required": False},
    {"key": "pre_poc_status", "label": "POC Stage 1 (Pre-PoC)", "required": False},
    {"key": "poc_status", "label": "POC Stage 2 (PoC)", "required": False},
    {"key": "post_poc_status", "label": "POC Stage 3 (Post-PoC)", "required": False},
    {"key": "kickoff_status", "label": "Deployment Stage 1 (Kick-Off)", "required": False},
    {"key": "materials_status", "label": "Deployment Stage 2 (Materials)", "required": False},
    {"key": "uat_fat_status", "label": "Deployment Stage 3 (UAT/FAT)", "required": False},
    {"key": "device_status", "label": "Device Status (On-Prem / Virtual / Cloud)", "required": False},
    {"key": "collected", "label": "Collected (True / False)", "required": False},
    {"key": "addon_1_name", "label": "Add-On Item 1 Name", "required": False},
    {"key": "addon_1_qty", "label": "Add-On Item 1 Quantity", "required": False},
    {"key": "addon_2_name", "label": "Add-On Item 2 Name", "required": False},
    {"key": "addon_2_qty", "label": "Add-On Item 2 Quantity", "required": False},
    {"key": "addon_3_name", "label": "Add-On Item 3 Name", "required": False},
    {"key": "addon_3_qty", "label": "Add-On Item 3 Quantity", "required": False},
    {"key": "deployment_folder", "label": "Link to Folder", "required": False},
    {"key": "lead_engineer", "label": "Led By / Lead Engineer", "required": False},
    {"key": "assisting_engineers", "label": "Assisted By / Assisting Engineers", "required": False},
    {"key": "validated_by", "label": "Validated By", "required": False},
    {"key": "notes", "label": "Remarks / Notes", "required": False},
]

def parse_excel_bytes(file_bytes: bytes, filename: str):
    import io, openpyxl, csv
    
    if filename.endswith(".csv"):
        text = file_bytes.decode("utf-8-sig", errors="ignore")
        reader = list(csv.reader(io.StringIO(text)))
        if not reader:
            return [], []
        headers = [str(c).strip() for c in reader[0]]
        parsed_rows = []
        for r in reader[1:]:
            if not any(r): continue
            row_dict = {}
            for idx, val in enumerate(r):
                if idx < len(headers):
                    row_dict[headers[idx]] = str(val).strip()
            parsed_rows.append(row_dict)
        return headers, parsed_rows

    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return [], []
    
    row0 = [str(c).strip() if c is not None else "" for c in rows[0]]
    row1 = [str(c).strip() if c is not None else "" for c in rows[1]] if len(rows) > 1 else []
    
    has_subheaders = False
    if row1 and any(h.lower() in ["pre-poc", "poc", "post-poc", "kick-off", "materials", "uat/fat", "remarks"] for h in row1):
        has_subheaders = True
    elif row1 and "Progress" in row0:
        has_subheaders = True
        
    headers = []
    start_data_row = 1
    if has_subheaders:
        start_data_row = 2
        last_top_header = ""
        prev_hdr = ""
        for i in range(max(len(row0), len(row1))):
            top = row0[i] if i < len(row0) else ""
            sub = row1[i] if i < len(row1) else ""
            
            if top and top.lower() in ["progress", "status", "phase"]:
                last_top_header = top
            elif top:
                last_top_header = top
            elif last_top_header and last_top_header.lower() in ["progress", "status", "phase"]:
                top = last_top_header
            else:
                top = ""
                
            if top and sub and top.lower() != sub.lower():
                hdr = f"{top} -> {sub}"
            elif sub:
                hdr = sub
            elif top:
                hdr = top
            else:
                hdr = f"Column_{i+1}"

            if hdr == "#":
                if "product 2" in prev_hdr.lower():
                    hdr = "Product 2 Qty"
                elif "product" in prev_hdr.lower():
                    hdr = "Product 1 Qty"
                elif "add-on item 3" in prev_hdr.lower() or "addon item 3" in prev_hdr.lower():
                    hdr = "Add-On Item 3 Qty"
                elif "add-on item 2" in prev_hdr.lower() or "addon item 2" in prev_hdr.lower():
                    hdr = "Add-On Item 2 Qty"
                elif "add-on item" in prev_hdr.lower() or "addon item" in prev_hdr.lower():
                    hdr = "Add-On Item 1 Qty"
                else:
                    hdr = f"{prev_hdr} Qty"

            prev_hdr = hdr
            headers.append(hdr)
    else:
        prev_hdr = ""
        for i, h in enumerate(row0):
            hdr = h if h else f"Column_{i+1}"
            if hdr == "#":
                if "product 2" in prev_hdr.lower():
                    hdr = "Product 2 Qty"
                elif "product" in prev_hdr.lower():
                    hdr = "Product 1 Qty"
                elif "add-on item 3" in prev_hdr.lower() or "addon item 3" in prev_hdr.lower():
                    hdr = "Add-On Item 3 Qty"
                elif "add-on item 2" in prev_hdr.lower() or "addon item 2" in prev_hdr.lower():
                    hdr = "Add-On Item 2 Qty"
                elif "add-on item" in prev_hdr.lower() or "addon item" in prev_hdr.lower():
                    hdr = "Add-On Item 1 Qty"
                else:
                    hdr = f"{prev_hdr} Qty"
            prev_hdr = hdr
            headers.append(hdr)
        
    data_rows = rows[start_data_row:]
    parsed_rows = []
    for r in data_rows:
        if not any(r):
            continue
        row_dict = {}
        for idx, val in enumerate(r):
            if idx < len(headers):
                hdr = headers[idx]
                row_dict[hdr] = str(val).strip() if val is not None else ""
        parsed_rows.append(row_dict)
        
    return headers, parsed_rows

def auto_match_headers(headers: List[str]) -> Dict[str, str]:
    mappings = {}
    for i, h in enumerate(headers):
        hl = h.lower().strip()
        if "customer" in hl or "company" in hl or "client" in hl:
            mappings.setdefault("customer_name", h)
        elif "sales" in hl or "account owner" in hl or "sales person" in hl:
            mappings.setdefault("account_owner", h)
        elif "product 2" in hl:
            if "qty" in hl or "#" in hl:
                mappings.setdefault("product_2_qty", h)
            else:
                mappings.setdefault("product_2", h)
        elif "product 1" in hl or hl == "product" or "product name" in hl:
            if "qty" in hl or "#" in hl:
                mappings.setdefault("product_1_qty", h)
            else:
                mappings.setdefault("product_1", h)
        elif "add-on item 3" in hl or "addon item 3" in hl:
            if "qty" in hl or "#" in hl:
                mappings.setdefault("addon_3_qty", h)
            else:
                mappings.setdefault("addon_3_name", h)
        elif "add-on item 2" in hl or "addon item 2" in hl:
            if "qty" in hl or "#" in hl:
                mappings.setdefault("addon_2_qty", h)
            else:
                mappings.setdefault("addon_2_name", h)
        elif "add-on item" in hl or "addon item" in hl:
            if "qty" in hl or "#" in hl:
                mappings.setdefault("addon_1_qty", h)
            else:
                mappings.setdefault("addon_1_name", h)
        elif "recieved date" in hl or "received date" in hl or "start date" in hl or hl == "start":
            mappings.setdefault("deployment_date", h)
        elif "kick-off date" in hl or "kickoff date" in hl:
            mappings.setdefault("kickoff_date", h)
        elif "end date" in hl or "target date" in hl or "due date" in hl:
            mappings.setdefault("end_date", h)
        elif "pre-poc" in hl or "prepoc" in hl:
            mappings.setdefault("pre_poc_status", h)
        elif "post-poc" in hl or "postpoc" in hl:
            mappings.setdefault("post_poc_status", h)
        elif "poc" in hl and "pre" not in hl and "post" not in hl:
            mappings.setdefault("poc_status", h)
        elif "kick-off" in hl or "kickoff" in hl:
            mappings.setdefault("kickoff_status", h)
        elif "materials" in hl:
            mappings.setdefault("materials_status", h)
        elif "uat" in hl or "fat" in hl:
            mappings.setdefault("uat_fat_status", h)
        elif "device status" in hl or "device" in hl:
            mappings.setdefault("device_status", h)
        elif "collected" in hl:
            mappings.setdefault("collected", h)
        elif "link to folder" in hl or "folder" in hl:
            mappings.setdefault("deployment_folder", h)
        elif "led by" in hl or "lead engineer" in hl:
            mappings.setdefault("lead_engineer", h)
        elif "assisted by" in hl or "assisting" in hl:
            mappings.setdefault("assisting_engineers", h)
        elif "validated by" in hl:
            mappings.setdefault("validated_by", h)
        elif "remark" in hl or "notes" in hl:
            mappings.setdefault("notes", h)
    return mappings

from fastapi import UploadFile, File, Form
import json

@router.post("/import-excel/preview")
async def preview_excel_import(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    contents = await file.read()
    headers, rows = parse_excel_bytes(contents, file.filename or "file.xlsx")
    mappings = auto_match_headers(headers)
    
    return {
        "headers": headers,
        "field_definitions": FIELD_DEFINITIONS,
        "auto_mappings": mappings,
        "row_count": len(rows),
        "preview_rows": rows[:5]
    }

DEPLOYMENT_STAGES_LIST = [
    "Initiated", "Device Received", "Box Prepared", "Kick Off Meeting Done",
    "Deployment in progress", "Preparing UAT/FAT/Documentation", "Waiting for signature", "Complete"
]

POC_STAGES_LIST = [
    "Initiated", "Box allocated", "Box prepared", "Pre-POC Meeting Done",
    "Deployment pending", "Deployment in progress", "Review Policy", "Collect Report",
    "POC Complete", "Post POC Meeting", "Complete", "Change to deployment"
]

def build_stage_statuses_map(dep_type, pre_poc, poc, post_poc, kickoff_st, materials_st, uat_fat_st):
    stages = POC_STAGES_LIST if dep_type == "POC" else DEPLOYMENT_STAGES_LIST
    stage_map = {}
    highest = 0

    if dep_type == "POC":
        p1 = (pre_poc or "").lower()
        p2 = (poc or "").lower()
        p3 = (post_poc or "").lower()
        if p1 in ["done", "complete", "completed"]: highest = max(highest, 3)
        elif p1 in ["in progress", "pending", "follow-up"]: stage_map["Pre-POC Meeting Done"] = "pending"
        if p2 in ["done", "complete", "completed"]: highest = max(highest, 8)
        elif p2 in ["in progress", "pending", "follow-up"]: stage_map["Deployment in progress"] = "pending"
        if p3 in ["done", "complete", "completed"]: highest = max(highest, 10)
        elif p3 in ["in progress", "pending", "follow-up"]: stage_map["Post POC Meeting"] = "pending"
    else:
        k1 = (kickoff_st or "").lower()
        m1 = (materials_st or "").lower()
        u1 = (uat_fat_st or "").lower()
        if k1 in ["done", "complete", "completed"]: highest = max(highest, 3)
        elif k1 in ["in progress", "pending", "follow-up"]: stage_map["Kick Off Meeting Done"] = "pending"
        if m1 in ["done", "complete", "completed"]: highest = max(highest, 2)
        elif m1 in ["in progress", "pending", "follow-up"]: stage_map["Box Prepared"] = "pending"
        if u1 in ["done", "complete", "completed"]: highest = max(highest, 7)
        elif u1 in ["in progress", "pending", "follow-up"]: stage_map["Preparing UAT/FAT/Documentation"] = "pending"

    for i, st in enumerate(stages):
        if i <= highest:
            stage_map[st] = "complete"
        elif st not in stage_map:
            stage_map[st] = "not_started"

    return stage_map

def parse_dt(dt_str: str) -> Optional[datetime]:
    if not dt_str: return None
    dt_str = dt_str.replace(".000000", "").replace(".000", "").strip()
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%Y/%m/%d"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            pass
    return None

@router.post("/import-excel/execute")
async def execute_excel_import(
    request: Request,
    file: UploadFile = File(...),
    mapping_json: str = Form(...),
    defaults_json: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(["create_deployment"]))
):
    contents = await file.read()
    headers, rows = parse_excel_bytes(contents, file.filename or "file.xlsx")
    mapping = json.loads(mapping_json)
    defaults = json.loads(defaults_json) if defaults_json else {}

    deployments_created = 0
    companies_created = 0
    extra_items_created = 0
    errors = []

    actual_db_cols = sync_orm_columns(db)

    def get_val(key: str, default_fallback: str = "") -> str:
        override = defaults.get(key, "").strip() if defaults.get(key) else ""
        if override:
            return override
        col = mapping.get(key)
        v = r.get(col, "").strip() if col else ""
        return v if v else default_fallback

    for idx, r in enumerate(rows, start=1):
        cust_name = get_val("customer_name")
        if not cust_name:
            continue

        # Find or create company
        comp = db.query(Company).filter(Company.name.ilike(cust_name), Company.deleted_at == None).first()
        if not comp:
            comp = Company(name=cust_name)
            db.add(comp)
            db.flush()
            companies_created += 1

        # Products to create deployments for
        products_to_create = []
        
        p1_name = get_val("product_1", "FieldOps Core Gateway")
        p1_qty_str = get_val("product_1_qty", "1")
        p1_qty = int(p1_qty_str) if p1_qty_str.isdigit() else 1
        
        products_to_create.append({"product": p1_name, "qty": p1_qty})

        p2_name = get_val("product_2")
        if p2_name:
            p2_qty_str = get_val("product_2_qty", "1")
            p2_qty = int(p2_qty_str) if p2_qty_str.isdigit() else 1
            products_to_create.append({"product": p2_name, "qty": p2_qty})

        # Add-On items
        addons = []
        for i in range(1, 4):
            an_val = get_val(f"addon_{i}_name")
            if an_val:
                aq_str = get_val(f"addon_{i}_qty", "1")
                aq_val = int(aq_str) if aq_str.isdigit() else 1
                addons.append({"name": an_val, "qty": aq_val})

        # Base fields
        acc_owner = get_val("account_owner") or None
        
        start_dt_str = get_val("deployment_date")
        start_dt = parse_dt(start_dt_str) if start_dt_str else None
        
        kickoff_dt_str = get_val("kickoff_date")
        kickoff_dt = parse_dt(kickoff_dt_str) if kickoff_dt_str else None
        
        end_dt_str = get_val("end_date")
        end_dt = parse_dt(end_dt_str) if end_dt_str else None

        pre_poc = get_val("pre_poc_status") or None
        poc = get_val("poc_status") or None
        post_poc = get_val("post_poc_status") or None

        kickoff_st = get_val("kickoff_status") or None
        materials_st = get_val("materials_status") or None
        uat_fat_st = get_val("uat_fat_status") or None

        dev_st = get_val("device_status") or None

        collected_val = get_val("collected").lower()
        collected_bool = collected_val in ["true", "1", "yes", "done", "physical"]

        folder = get_val("deployment_folder") or None
        lead_eng = get_val("lead_engineer") or None
        assist_eng = get_val("assisting_engineers") or None
        val_by = get_val("validated_by") or None
        notes_val = get_val("notes") or None

        # Auto-detect deployment_type
        dep_type = get_val("deployment_type")
        if not dep_type:
            if pre_poc or poc or post_poc:
                dep_type = "POC"
            else:
                dep_type = "Deployment"

        stage_st_map = build_stage_statuses_map(dep_type, pre_poc, poc, post_poc, kickoff_st, materials_st, uat_fat_st)

        # Create deployments
        for item_info in products_to_create:
            try:
                dep = Deployment(
                    company_id=comp.id,
                    customer_name=comp.name,
                    deployed_product=item_info["product"],
                    product_quantity=item_info["qty"],
                    account_owner=acc_owner,
                    deployment_type=dep_type,
                    stage_statuses=stage_st_map,
                    deployment_date=start_dt or datetime.utcnow(),
                    kickoff_date=kickoff_dt,
                    end_date=end_dt,
                    pre_poc_status=pre_poc,
                    poc_status=poc,
                    post_poc_status=post_poc,
                    kickoff_status=kickoff_st,
                    materials_status=materials_st,
                    uat_fat_status=uat_fat_st,
                    device_status=dev_st,
                    collected=collected_bool,
                    deployment_folder=folder,
                    lead_engineer=lead_eng,
                    assisting_engineers=assist_eng,
                    validated_by=val_by,
                    notes=notes_val,
                    created_by_id=current_user.id
                )
                db.add(dep)
                db.flush()
                deployments_created += 1

                # Add extra items
                for add_on in addons:
                    ex = DeploymentExtraItem(
                        deployment_id=dep.id,
                        item_name=add_on["name"],
                        quantity=add_on["qty"]
                    )
                    db.add(ex)
                    extra_items_created += 1

            except Exception as e:
                errors.append(f"Row {idx} ({cust_name}): {str(e)}")

    db.commit()

    return {
        "success": True,
        "deployments_created": deployments_created,
        "companies_created": companies_created,
        "extra_items_created": extra_items_created,
        "errors": errors
    }


