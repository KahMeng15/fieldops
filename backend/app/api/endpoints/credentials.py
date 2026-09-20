from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.base import get_db
from app.models import Credential, AuditLog, User
from app.schemas import CredentialCreate, CredentialResponse
from app.api.deps import get_current_user, require_permission
from app.core.encryption import encrypt_credential, decrypt_credential, get_master_key
from app.core.audit import parse_client_info
from typing import List
from uuid import UUID

router = APIRouter()
MASTER_KEY = get_master_key()

@router.get("", response_model=List[CredentialResponse])
@router.get("/", response_model=List[CredentialResponse])
async def list_credentials(
    deployment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    creds = db.query(Credential).filter(
        Credential.deployment_id == deployment_id, 
        Credential.deleted_at == None
    ).all()
    
    # Mask payload
    result = []
    for cred in creds:
        result.append(CredentialResponse(
            id=cred.id,
            deployment_id=cred.deployment_id,
            credential_type=cred.credential_type,
            label=cred.label,
            encrypted_payload="********"
        ))
    return result

@router.post("", response_model=CredentialResponse, status_code=201)
@router.post("/", response_model=CredentialResponse, status_code=201)
async def create_credential(
    request: Request,
    data: CredentialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(["create_credential"]))
):
    encrypted = encrypt_credential(data.payload, MASTER_KEY)
    
    cred = Credential(
        deployment_id=data.deployment_id,
        credential_type=data.credential_type,
        label=data.label,
        encrypted_payload=encrypted,
        created_by_id=current_user.id
    )
    db.add(cred)
    db.commit()
    db.refresh(cred)
    
    client_info = parse_client_info(request)
    audit_log = AuditLog(
        user_id=current_user.id,
        action="create_credential",
        resource_type="credential",
        resource_id=cred.id,
        ip_address=client_info["ip_address"],
        new_value={
            "item_name": cred.label,
            "credential_type": cred.credential_type,
            "deployment_id": str(cred.deployment_id),
            **client_info
        },
        notes=f"Created {cred.credential_type} credential '{cred.label}'"
    )
    db.add(audit_log)
    db.commit()
    
    return CredentialResponse(
        id=cred.id,
        deployment_id=cred.deployment_id,
        credential_type=cred.credential_type,
        label=cred.label,
        encrypted_payload="********"
    )

@router.post("/{cred_id}/reveal")
async def reveal_credential(
    cred_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(["reveal_credential"]))
):
    cred = db.query(Credential).filter(Credential.id == cred_id, Credential.deleted_at == None).first()
    if not cred:
        raise HTTPException(404, "Credential not found")
    
    plaintext = decrypt_credential(cred.encrypted_payload, MASTER_KEY)
    client_info = parse_client_info(request)
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="reveal_credential",
        resource_type="credential",
        resource_id=cred_id,
        ip_address=client_info["ip_address"],
        new_value={
            "item_name": cred.label,
            "credential_type": cred.credential_type,
            "deployment_id": str(cred.deployment_id),
            **client_info
        },
        notes=f"Revealed and decrypted {cred.credential_type} credential '{cred.label}'"
    )
    db.add(audit_log)
    db.commit()
    
    return {"credential": plaintext}

@router.delete("/{cred_id}", status_code=204)
async def delete_credential(
    cred_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cred = db.query(Credential).filter(Credential.id == cred_id, Credential.deleted_at == None).first()
    if not cred:
        raise HTTPException(404, "Credential not found")
    
    cred.deleted_at = datetime.utcnow()
    client_info = parse_client_info(request)
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="delete_credential",
        resource_type="credential",
        resource_id=cred_id,
        ip_address=client_info["ip_address"],
        new_value={
            "item_name": cred.label,
            "credential_type": cred.credential_type,
            "deployment_id": str(cred.deployment_id),
            **client_info
        },
        notes=f"Deleted credential '{cred.label}'"
    )
    db.add(audit_log)
    db.commit()
    return None
