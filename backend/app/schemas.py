from pydantic import BaseModel, EmailStr, model_validator
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    team_id: Optional[UUID] = None
    role_id: Optional[UUID] = None

class User(UserBase):
    id: UUID
    is_active: bool
    last_login_at: Optional[datetime] = None
    team_id: Optional[UUID]
    role_id: Optional[UUID]

    class Config:
        from_attributes = True

class LoginSchema(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class LocationBase(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    datacenter_tier: Optional[str] = None
    notes: Optional[str] = None

class LocationCreate(LocationBase):
    company_id: Optional[UUID] = None

class LocationResponse(LocationBase):
    id: UUID
    company_id: UUID
    deployments_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CompanyContactBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    notes: Optional[str] = None

class CompanyContactCreate(CompanyContactBase):
    pass

class CompanyContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    notes: Optional[str] = None

class CompanyContactResponse(CompanyContactBase):
    id: UUID
    company_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CompanyBase(BaseModel):
    name: str
    description: Optional[str] = None
    website: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyResponse(CompanyBase):
    id: UUID
    locations_count: Optional[int] = 0
    deployments_count: Optional[int] = 0
    locations: Optional[List[LocationResponse]] = None
    contacts: Optional[List[CompanyContactResponse]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DeploymentSchema(BaseModel):
    customer_name: Optional[str] = None
    location: Optional[str] = None
    company_id: Optional[UUID] = None
    location_id: Optional[UUID] = None
    deployed_product: Optional[str] = "FieldOps Core Gateway"
    deployment_date: Optional[datetime] = None
    internal_group_name: Optional[str] = None
    account_owner: Optional[str] = None
    lead_engineer: Optional[str] = None
    assisting_engineers: Optional[str] = None
    deployment_type: Optional[str] = None
    pre_poc_status: Optional[str] = None
    poc_status: Optional[str] = None
    post_poc_status: Optional[str] = None
    status_updated_at: Optional[datetime] = None
    status_updated_by_id: Optional[UUID] = None
    status_updated_by_name: Optional[str] = None
    deployment_folder: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        extra = "allow"

class DeploymentResponse(DeploymentSchema):
    id: UUID
    account_owner_id: Optional[UUID] = None
    server_collected_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[UUID] = None

    class Config:
        from_attributes = True
        extra = "allow"

    @model_validator(mode="before")
    @classmethod
    def from_orm_extra(cls, data: Any) -> Any:
        if hasattr(data, "__table__"):
            # Trigger reload if expired
            _ = getattr(data, "id", None)
            cols = {c.name for c in data.__table__.columns}
            d = {}
            for col in cols:
                d[col] = getattr(data, col, None)
            for k, v in getattr(data, "__dict__", {}).items():
                if not k.startswith("_") and k not in d:
                    d[k] = v
            if hasattr(data, "company") and data.company:
                d["customer_name"] = data.company.name
            if hasattr(data, "location_rel") and data.location_rel:
                d["location"] = data.location_rel.name
            if not d.get("status_updated_by_name") and hasattr(data, "status_updated_by_user") and data.status_updated_by_user:
                d["status_updated_by_name"] = data.status_updated_by_user.username
            return d
        elif hasattr(data, "__dict__"):
            return {k: v for k, v in data.__dict__.items() if not k.startswith("_")}
        return data

class CredentialCreate(BaseModel):
    deployment_id: UUID
    credential_type: str
    label: str
    payload: Dict[str, Any]

class CredentialUpdate(BaseModel):
    label: Optional[str] = None
    credential_type: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None

class CredentialResponse(BaseModel):
    id: UUID
    deployment_id: UUID
    credential_type: str
    label: str
    encrypted_payload: str  # Masked payload

    class Config:
        from_attributes = True
