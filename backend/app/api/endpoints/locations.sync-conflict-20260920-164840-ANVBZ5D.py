from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.base import get_db
from app.models import Company, Location, Deployment, AuditLog, User
from app.schemas import (
    LocationCreate,
    LocationResponse,
    DeploymentResponse
)
from app.api.deps import get_current_user, require_permission
from app.api.endpoints.deployments import sync_orm_columns
from typing import List, Optional
from datetime import datetime
from uuid import UUID

router = APIRouter()

@router.get("", response_model=List[LocationResponse])
@router.get("/", response_model=List[LocationResponse])
async def list_locations(
    company_id: Optional[UUID] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Location).filter(Location.deleted_at == None)
    if company_id:
        query = query.filter(Location.company_id == company_id)
    if search:
        query = query.filter(Location.name.ilike(f"%{search}%"))
    
    locations = query.order_by(Location.name.asc()).all()
    results = []
    for loc in locations:
        dep_count = db.query(func.count(Deployment.id)).filter(
            Deployment.location_id == loc.id,
            Deployment.deleted_at == None
        ).scalar() or 0
        loc_dict = {
            "id": loc.id,
            "company_id": loc.company_id,
            "name": loc.name,
            "address": loc.address,
            "city": loc.city,
            "country": loc.country,
            "datacenter_tier": loc.datacenter_tier,
            "notes": loc.notes,
            "deployments_count": dep_count,
            "created_at": loc.created_at,
            "updated_at": loc.updated_at
        }
        results.append(LocationResponse(**loc_dict))
    return results

@router.get("/{id}", response_model=LocationResponse)
async def get_location(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    loc = db.query(Location).filter(Location.id == id, Location.deleted_at == None).first()
    if not loc:
        raise HTTPException(404, "Location not found")
    
    dep_count = db.query(func.count(Deployment.id)).filter(
        Deployment.location_id == loc.id,
        Deployment.deleted_at == None
    ).scalar() or 0

    return LocationResponse(
        id=loc.id,
        company_id=loc.company_id,
        name=loc.name,
        address=loc.address,
        city=loc.city,
        country=loc.country,
        datacenter_tier=loc.datacenter_tier,
        notes=loc.notes,
        deployments_count=dep_count,
        created_at=loc.created_at,
        updated_at=loc.updated_at
    )

@router.get("/{id}/deployments", response_model=List[DeploymentResponse])
async def list_location_deployments(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    loc = db.query(Location).filter(Location.id == id, Location.deleted_at == None).first()
    if not loc:
        raise HTTPException(404, "Location not found")

    sync_orm_columns(db)
    deployments = db.query(Deployment).filter(
        Deployment.location_id == id,
        Deployment.deleted_at == None
    ).order_by(Deployment.deployment_date.desc(), Deployment.created_at.desc()).all()
    
    return deployments

@router.patch("/{id}", response_model=LocationResponse)
async def update_location(
    id: UUID,
    data: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(["create_deployment"]))
):
    loc = db.query(Location).filter(Location.id == id, Location.deleted_at == None).first()
    if not loc:
        raise HTTPException(404, "Location not found")
    
    if data.name:
        loc.name = data.name.strip()
    if data.address is not None:
        loc.address = data.address
    if data.city is not None:
        loc.city = data.city
    if data.country is not None:
        loc.country = data.country
    if data.datacenter_tier is not None:
        loc.datacenter_tier = data.datacenter_tier
    if data.notes is not None:
        loc.notes = data.notes

    db.commit()
    db.refresh(loc)

    # Sync location name to deployments
    db.query(Deployment).filter(Deployment.location_id == loc.id).update(
        {"location": loc.name}, synchronize_session=False
    )
    db.commit()

    dep_count = db.query(func.count(Deployment.id)).filter(
        Deployment.location_id == loc.id,
        Deployment.deleted_at == None
    ).scalar() or 0

    return LocationResponse(
        id=loc.id,
        company_id=loc.company_id,
        name=loc.name,
        address=loc.address,
        city=loc.city,
        country=loc.country,
        datacenter_tier=loc.datacenter_tier,
        notes=loc.notes,
        deployments_count=dep_count,
        created_at=loc.created_at,
        updated_at=loc.updated_at
    )

@router.delete("/{id}", status_code=204)
async def delete_location(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(["delete_deployment"]))
):
    loc = db.query(Location).filter(Location.id == id, Location.deleted_at == None).first()
    if not loc:
        raise HTTPException(404, "Location not found")
    loc.deleted_at = datetime.utcnow()
    db.commit()
    return None
