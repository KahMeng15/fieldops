from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import text, Column, String, func
from app.db.base import get_db
from app.models import Deployment, AuditLog, User, Company, Location
from app.schemas import DeploymentSchema, DeploymentResponse
from app.api.deps import get_current_user, require_permission
from typing import List, Optional, Set
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
    elif customer_name:
        comp = db.query(Company).filter(func.lower(Company.name) == customer_name.lower(), Company.deleted_at == None).first()
        if not comp:
            comp = Company(name=customer_name)
            db.add(comp)
            db.commit()
            db.refresh(comp)
        company_id = comp.id

    if location_id:
        loc = db.query(Location).filter(Location.id == location_id).first()
        if loc:
            loc_name = loc.name
            if not company_id:
                company_id = loc.company_id
    elif loc_name and company_id:
        loc = db.query(Location).filter(Location.company_id == company_id, func.lower(Location.name) == loc_name.lower(), Location.deleted_at == None).first()
        if not loc:
            loc = Location(company_id=company_id, name=loc_name)
            db.add(loc)
            db.commit()
            db.refresh(loc)
        location_id = loc.id

    payload_data["company_id"] = company_id
    payload_data["location_id"] = location_id
    if customer_name:
        payload_data["customer_name"] = customer_name
    if loc_name:
        payload_data["location"] = loc_name
    if not payload_data.get("deployed_product"):
        payload_data["deployed_product"] = data.deployed_product or "FieldOps Core Gateway"
    if not payload_data.get("deployment_date"):
        payload_data["deployment_date"] = data.deployment_date or datetime.utcnow()

    payload_data["status_updated_at"] = datetime.utcnow()
    payload_data["status_updated_by_id"] = current_user.id
    payload_data["status_updated_by_name"] = current_user.username

    deployment = Deployment(**payload_data, created_by_id=current_user.id)
    db.add(deployment)
    db.flush()
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="create_deployment",
        resource_type="deployment",
        resource_id=deployment.id,
        ip_address=request.client.host if request.client else "127.0.0.1",
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
    if "pre_poc_status" in data_dict or "poc_status" in data_dict or "post_poc_status" in data_dict:
        deployment.status_updated_at = datetime.utcnow()
        deployment.status_updated_by_id = current_user.id
        deployment.status_updated_by_name = current_user.username

    for key, value in data_dict.items():
        if key in actual_db_cols:
            setattr(deployment, key, value)
    
    db.commit()
    db.refresh(deployment)
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="update_deployment",
        resource_type="deployment",
        resource_id=deployment.id,
        ip_address=request.client.host if request.client else "127.0.0.1"
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
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="delete_deployment",
        resource_type="deployment",
        resource_id=deployment.id,
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    db.add(audit_log)
    db.commit()
    return None
