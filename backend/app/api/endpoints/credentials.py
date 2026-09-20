from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from app.db.base import get_db
from app.models import Credential, AuditLog, User, CredentialVersion
from app.schemas import CredentialCreate, CredentialUpdate, CredentialResponse, CredentialVersionResponse
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
    
    init_version = CredentialVersion(
        credential_id=cred.id,
        deployment_id=cred.deployment_id,
        version_number=1,
        credential_type=cred.credential_type,
        label=cred.label,
        encrypted_payload=encrypted,
        changed_by_id=current_user.id,
        changed_by_name=current_user.username,
        change_summary="Initial credential creation",
        created_at=cred.created_at or datetime.utcnow()
    )
    db.add(init_version)
    db.commit()
    
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

@router.put("/{cred_id}", response_model=CredentialResponse)
@router.patch("/{cred_id}", response_model=CredentialResponse)
async def update_credential(
    cred_id: UUID,
    request: Request,
    data: CredentialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(["edit_credential", "create_credential"]))
):
    cred = db.query(Credential).filter(Credential.id == cred_id, Credential.deleted_at == None).first()
    if not cred:
        raise HTTPException(404, "Credential not found")
    
    # Check existing versions
    max_ver = db.query(func.max(CredentialVersion.version_number)).filter(
        CredentialVersion.credential_id == cred.id
    ).scalar()

    if not max_ver:
        # Snapshot previous state as Version 1
        db.add(CredentialVersion(
            credential_id=cred.id,
            deployment_id=cred.deployment_id,
            version_number=1,
            credential_type=cred.credential_type,
            label=cred.label,
            encrypted_payload=cred.encrypted_payload,
            changed_by_id=cred.created_by_id,
            changed_by_name="System / Creator",
            change_summary="Original credential version",
            created_at=cred.created_at or datetime.utcnow()
        ))
        max_ver = 1
    
    if data.label is not None:
        cred.label = data.label
    if data.credential_type is not None:
        cred.credential_type = data.credential_type
    if data.payload is not None:
        cred.encrypted_payload = encrypt_credential(data.payload, MASTER_KEY)
    
    cred.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cred)
    
    # Add new version
    new_ver_num = max_ver + 1
    new_version = CredentialVersion(
        credential_id=cred.id,
        deployment_id=cred.deployment_id,
        version_number=new_ver_num,
        credential_type=cred.credential_type,
        label=cred.label,
        encrypted_payload=cred.encrypted_payload,
        changed_by_id=current_user.id,
        changed_by_name=current_user.username,
        change_summary=f"Updated to Version {new_ver_num}",
        created_at=datetime.utcnow()
    )
    db.add(new_version)
    db.commit()
    
    client_info = parse_client_info(request)
    audit_log = AuditLog(
        user_id=current_user.id,
        action="edit_credential",
        resource_type="credential",
        resource_id=cred_id,
        ip_address=client_info["ip_address"],
        new_value={
            "item_name": cred.label,
            "credential_type": cred.credential_type,
            "version_number": new_ver_num,
            "deployment_id": str(cred.deployment_id),
            **client_info
        },
        notes=f"Updated and re-encrypted {cred.credential_type} credential '{cred.label}' (Version {new_ver_num})"
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

@router.get("/{cred_id}/versions", response_model=List[CredentialVersionResponse])
async def list_credential_versions(
    cred_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cred = db.query(Credential).filter(Credential.id == cred_id, Credential.deleted_at == None).first()
    if not cred:
        raise HTTPException(404, "Credential not found")

    versions = db.query(CredentialVersion).filter(
        CredentialVersion.credential_id == cred_id
    ).order_by(CredentialVersion.version_number.desc()).all()

    if not versions:
        v1 = CredentialVersion(
            credential_id=cred.id,
            deployment_id=cred.deployment_id,
            version_number=1,
            credential_type=cred.credential_type,
            label=cred.label,
            encrypted_payload=cred.encrypted_payload,
            changed_by_id=cred.created_by_id,
            changed_by_name="Creator",
            change_summary="Initial credential version",
            created_at=cred.created_at or datetime.utcnow()
        )
        db.add(v1)
        db.commit()
        db.refresh(v1)
        versions = [v1]

    return [
        CredentialVersionResponse(
            id=v.id,
            credential_id=v.credential_id,
            deployment_id=v.deployment_id,
            version_number=v.version_number,
            credential_type=v.credential_type,
            label=v.label,
            changed_by_name=v.changed_by_name,
            change_summary=v.change_summary,
            created_at=v.created_at,
            encrypted_payload="********"
        )
        for v in versions
    ]

@router.post("/versions/{version_id}/reveal")
async def reveal_credential_version(
    version_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(["reveal_credential"]))
):
    version = db.query(CredentialVersion).filter(CredentialVersion.id == version_id).first()
    if not version:
        raise HTTPException(404, "Historical credential version not found")

    plaintext = decrypt_credential(version.encrypted_payload, MASTER_KEY)
    client_info = parse_client_info(request)

    audit_log = AuditLog(
        user_id=current_user.id,
        action="reveal_historical_credential",
        resource_type="credential_version",
        resource_id=version_id,
        ip_address=client_info["ip_address"],
        new_value={
            "credential_id": str(version.credential_id),
            "version_number": version.version_number,
            "item_name": version.label,
            "credential_type": version.credential_type,
            "deployment_id": str(version.deployment_id),
            **client_info
        },
        notes=f"Revealed and decrypted historical Version {version.version_number} of credential '{version.label}'"
    )
    db.add(audit_log)
    db.commit()

    return {
        "credential": plaintext,
        "version_number": version.version_number,
        "label": version.label,
        "credential_type": version.credential_type
    }

@router.post("/versions/{version_id}/restore", response_model=CredentialResponse)
async def restore_credential_version(
    version_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(["edit_credential", "create_credential"]))
):
    version = db.query(CredentialVersion).filter(CredentialVersion.id == version_id).first()
    if not version:
        raise HTTPException(404, "Historical credential version not found")

    cred = db.query(Credential).filter(Credential.id == version.credential_id, Credential.deleted_at == None).first()
    if not cred:
        raise HTTPException(404, "Parent credential not found or deleted")

    max_ver = db.query(func.max(CredentialVersion.version_number)).filter(
        CredentialVersion.credential_id == cred.id
    ).scalar() or 1

    cred.label = version.label
    cred.credential_type = version.credential_type
    cred.encrypted_payload = version.encrypted_payload
    cred.updated_at = datetime.utcnow()

    new_ver_num = max_ver + 1
    new_ver = CredentialVersion(
        credential_id=cred.id,
        deployment_id=cred.deployment_id,
        version_number=new_ver_num,
        credential_type=cred.credential_type,
        label=cred.label,
        encrypted_payload=cred.encrypted_payload,
        changed_by_id=current_user.id,
        changed_by_name=current_user.username,
        change_summary=f"Restored from historical Version {version.version_number}",
        created_at=datetime.utcnow()
    )
    db.add(new_ver)
    db.commit()
    db.refresh(cred)

    client_info = parse_client_info(request)
    audit_log = AuditLog(
        user_id=current_user.id,
        action="restore_credential_version",
        resource_type="credential",
        resource_id=cred.id,
        ip_address=client_info["ip_address"],
        new_value={
            "item_name": cred.label,
            "credential_type": cred.credential_type,
            "restored_from_version": version.version_number,
            "new_version": new_ver_num,
            "deployment_id": str(cred.deployment_id),
            **client_info
        },
        notes=f"Restored credential '{cred.label}' to historical Version {version.version_number} (now Version {new_ver_num})"
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
