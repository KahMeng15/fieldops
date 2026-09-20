from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.models import Deployment, AuditLog, User
from app.schemas import DeploymentSchema, DeploymentResponse
from app.api.deps import get_current_user, require_permission
from typing import List, Optional
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[DeploymentResponse])
async def list_deployments(
    customer: Optional[str] = None,
    status: Optional[str] = None,
    team: Optional[str] = None,
    engineer: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Deployment).filter(Deployment.deleted_at == None)
    if customer:
        query = query.filter(Deployment.customer_name.ilike(f"%{customer}%"))
    # Filtering by status, team, engineer omitted for simplicity but could be implemented similarly
    
    return query.all()

@router.post("/", response_model=DeploymentResponse, status_code=201)
async def create_deployment(
    request: Request,
    data: DeploymentSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(["create_deployment"]))
):
    deployment = Deployment(**data.dict(), created_by_id=current_user.id)
    db.add(deployment)
    db.commit()
    db.refresh(deployment)
    
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
    
    return deployment

@router.get("/{id}", response_model=DeploymentResponse)
async def get_deployment(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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
    deployment = db.query(Deployment).filter(Deployment.id == id, Deployment.deleted_at == None).first()
    if not deployment:
        raise HTTPException(404, "Deployment not found")
    
    for key, value in data.dict(exclude_unset=True).items():
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
