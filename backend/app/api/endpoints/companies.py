from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.base import get_db
from app.models import Company, Location, Deployment, AuditLog, User
from app.schemas import (
    CompanyCreate,
    CompanyResponse,
    LocationCreate,
    LocationResponse,
    DeploymentResponse
)
from app.api.deps import get_current_user, require_permission
from typing import List, Optional
from datetime import datetime
from uuid import UUID

router = APIRouter()

@router.get("", response_model=List[CompanyResponse])
@router.get("/", response_model=List[CompanyResponse])
async def list_companies(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Company).filter(Company.deleted_at == None)
    if search:
        query = query.filter(Company.name.ilike(f"%{search}%"))
    
    companies = query.order_by(Company.name.asc()).all()
    results = []
    for c in companies:
        loc_count = db.query(func.count(Location.id)).filter(
            Location.company_id == c.id, 
            Location.deleted_at == None
        ).scalar() or 0
        dep_count = db.query(func.count(Deployment.id)).filter(
            Deployment.company_id == c.id, 
            Deployment.deleted_at == None
        ).scalar() or 0
        
        c_dict = {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "website": c.website,
            "contact_email": c.contact_email,
            "contact_phone": c.contact_phone,
            "locations_count": loc_count,
            "deployments_count": dep_count,
            "created_at": c.created_at,
            "updated_at": c.updated_at
        }
        results.append(CompanyResponse(**c_dict))
    return results

@router.post("", response_model=CompanyResponse, status_code=201)
@router.post("/", response_model=CompanyResponse, status_code=201)
async def create_company(
    data: CompanyCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(["create_deployment"]))
):
    existing = db.query(Company).filter(
        func.lower(Company.name) == data.name.strip().lower(),
        Company.deleted_at == None
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Company with name '{data.name}' already exists.")
    
    company = Company(
        name=data.name.strip(),
        description=data.description,
        website=data.website,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    audit_log = AuditLog(
        user_id=current_user.id,
        action="create_company",
        resource_type="company",
        resource_id=company.id,
        ip_address=request.client.host if request.client else "127.0.0.1",
        notes=f"Created company {company.name}"
    )
    db.add(audit_log)
    db.commit()

    return CompanyResponse(
        id=company.id,
        name=company.name,
        description=company.description,
        website=company.website,
        contact_email=company.contact_email,
        contact_phone=company.contact_phone,
        locations_count=0,
        deployments_count=0,
        created_at=company.created_at,
        updated_at=company.updated_at
    )

@router.get("/{id}", response_model=CompanyResponse)
async def get_company(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    company = db.query(Company).filter(Company.id == id, Company.deleted_at == None).first()
    if not company:
        raise HTTPException(404, "Company not found")
    
    locations = db.query(Location).filter(
        Location.company_id == company.id,
        Location.deleted_at == None
    ).order_by(Location.name.asc()).all()

    loc_responses = []
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
        loc_responses.append(LocationResponse(**loc_dict))

    dep_count_total = db.query(func.count(Deployment.id)).filter(
        Deployment.company_id == company.id,
        Deployment.deleted_at == None
    ).scalar() or 0

    return CompanyResponse(
        id=company.id,
        name=company.name,
        description=company.description,
        website=company.website,
        contact_email=company.contact_email,
        contact_phone=company.contact_phone,
        locations_count=len(loc_responses),
        deployments_count=dep_count_total,
        locations=loc_responses,
        created_at=company.created_at,
        updated_at=company.updated_at
    )

@router.patch("/{id}", response_model=CompanyResponse)
async def update_company(
    id: UUID,
    data: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(["create_deployment"]))
):
    company = db.query(Company).filter(Company.id == id, Company.deleted_at == None).first()
    if not company:
        raise HTTPException(404, "Company not found")
    
    if data.name:
        company.name = data.name.strip()
    if data.description is not None:
        company.description = data.description
    if data.website is not None:
        company.website = data.website
    if data.contact_email is not None:
        company.contact_email = data.contact_email
    if data.contact_phone is not None:
        company.contact_phone = data.contact_phone

    db.commit()
    db.refresh(company)

    # Sync company name to existing deployments customer_name for consistency
    db.query(Deployment).filter(Deployment.company_id == company.id).update(
        {"customer_name": company.name}, synchronize_session=False
    )
    db.commit()

    return CompanyResponse(
        id=company.id,
        name=company.name,
        description=company.description,
        website=company.website,
        contact_email=company.contact_email,
        contact_phone=company.contact_phone,
        created_at=company.created_at,
        updated_at=company.updated_at
    )

@router.delete("/{id}", status_code=204)
async def delete_company(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(["delete_deployment"]))
):
    company = db.query(Company).filter(Company.id == id, Company.deleted_at == None).first()
    if not company:
        raise HTTPException(404, "Company not found")
    company.deleted_at = datetime.utcnow()
    db.commit()
    return None

# Location endpoints under company
@router.get("/{id}/locations", response_model=List[LocationResponse])
@router.get("/{id}/locations/", response_model=List[LocationResponse])
async def list_company_locations(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    locations = db.query(Location).filter(
        Location.company_id == id,
        Location.deleted_at == None
    ).order_by(Location.name.asc()).all()

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

@router.post("/{id}/locations", response_model=LocationResponse, status_code=201)
@router.post("/{id}/locations/", response_model=LocationResponse, status_code=201)
async def create_company_location(
    id: UUID,
    data: LocationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(["create_deployment"]))
):
    company = db.query(Company).filter(Company.id == id, Company.deleted_at == None).first()
    if not company:
        raise HTTPException(404, "Company not found")
    
    existing = db.query(Location).filter(
        Location.company_id == id,
        func.lower(Location.name) == data.name.strip().lower(),
        Location.deleted_at == None
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Location '{data.name}' already exists for this company.")

    location = Location(
        company_id=id,
        name=data.name.strip(),
        address=data.address,
        city=data.city,
        country=data.country,
        datacenter_tier=data.datacenter_tier,
        notes=data.notes
    )
    db.add(location)
    db.commit()
    db.refresh(location)

    audit_log = AuditLog(
        user_id=current_user.id,
        action="create_location",
        resource_type="location",
        resource_id=location.id,
        ip_address=request.client.host if request.client else "127.0.0.1",
        notes=f"Created location {location.name} for company {company.name}"
    )
    db.add(audit_log)
    db.commit()

    return LocationResponse(
        id=location.id,
        company_id=location.company_id,
        name=location.name,
        address=location.address,
        city=location.city,
        country=location.country,
        datacenter_tier=location.datacenter_tier,
        notes=location.notes,
        deployments_count=0,
        created_at=location.created_at,
        updated_at=location.updated_at
    )
