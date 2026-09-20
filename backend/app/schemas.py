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

class DeploymentSchema(BaseModel):
    customer_name: str
    location: str
    internal_group_name: Optional[str] = None
    deployment_type: Optional[str] = None
    pre_poc_status: Optional[str] = None
    poc_status: Optional[str] = None
    post_poc_status: Optional[str] = None
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
        if hasattr(data, "__dict__"):
            return {k: v for k, v in data.__dict__.items() if not k.startswith("_")}
        return data

class CredentialCreate(BaseModel):
    deployment_id: UUID
    credential_type: str
    label: str
    payload: Dict[str, Any]

class CredentialResponse(BaseModel):
    id: UUID
    deployment_id: UUID
    credential_type: str
    label: str
    encrypted_payload: str  # Masked payload

    class Config:
        from_attributes = True
