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

