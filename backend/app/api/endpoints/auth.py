import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.models import User, Role, Team
from app.schemas import LoginSchema, MicrosoftLoginSchema, Token, User as UserSchema
from app.core.security import verify_password, create_access_token
from app.api.deps import get_current_user
from datetime import datetime, timedelta
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.get("/config")
async def get_auth_config():
    """Returns public Auth config for frontend Microsoft SSO integration."""
    return {
        "microsoft_enabled": bool(settings.AZURE_CLIENT_ID and settings.AZURE_TENANT_ID),
        "azure_client_id": settings.AZURE_CLIENT_ID,
        "azure_tenant_id": settings.AZURE_TENANT_ID,
        "azure_redirect_uri": settings.AZURE_REDIRECT_URI,
    }

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    credentials: LoginSchema,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == credentials.username).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(user.id)
    refresh_token = create_access_token(user.id, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
    
    user.last_login_at = datetime.utcnow()
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/microsoft", response_model=Token)
@limiter.limit("10/minute")
async def microsoft_login(
    request: Request,
    payload: MicrosoftLoginSchema,
    db: Session = Depends(get_db)
):
    if not settings.AZURE_CLIENT_ID or not settings.AZURE_TENANT_ID or not settings.AZURE_CLIENT_SECRET:
        raise HTTPException(
            status_code=400, 
            detail="Microsoft SSO is not configured on the server. Please check AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID environment variables."
        )

    redirect_uri = payload.redirect_uri or settings.AZURE_REDIRECT_URI

    # 1. Exchange OAuth Authorization Code with Microsoft token endpoint
    token_url = f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}/oauth2/v2.0/token"
    token_data = {
        "client_id": settings.AZURE_CLIENT_ID,
        "grant_type": "authorization_code",
        "scope": "openid profile email User.Read",
        "code": payload.code,
        "redirect_uri": redirect_uri,
        "client_secret": settings.AZURE_CLIENT_SECRET,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            token_res = await client.post(token_url, data=token_data)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to communicate with Microsoft Identity Provider: {str(e)}")

        if token_res.status_code != 200:
            err_data = token_res.json() if token_res.headers.get("content-type", "").startswith("application/json") else {}
            err_desc = err_data.get("error_description", token_res.text)
            raise HTTPException(status_code=401, detail=f"Microsoft authentication failed: {err_desc}")

        tokens = token_res.json()
        ms_access_token = tokens.get("access_token")

        # 2. Query Microsoft Graph API to fetch authenticated user profile (Name & Email)
        try:
            graph_res = await client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {ms_access_token}"}
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch Microsoft Graph user profile: {str(e)}")

        if graph_res.status_code != 200:
            raise HTTPException(status_code=401, detail="Could not retrieve Microsoft user profile")

        profile = graph_res.json()

    ms_email = (profile.get("mail") or profile.get("userPrincipalName") or "").strip().lower()
    ms_display_name = (profile.get("displayName") or ms_email).strip()

    if not ms_email:
        raise HTTPException(status_code=400, detail="Microsoft account email address could not be retrieved.")

    # 3. Retrieve or auto-provision user in FieldOps Database
    user = db.query(User).filter(User.email.ilike(ms_email)).first()
    if not user:
        # Check by username as fallback
        user = db.query(User).filter(User.username.ilike(ms_display_name)).first()

    if not user:
        default_role = db.query(Role).filter_by(name="manager").first() or db.query(Role).first()
        default_team = db.query(Team).filter_by(name="HQ Admin").first() or db.query(Team).first()
        user = User(
            username=ms_display_name,
            email=ms_email,
            password_hash="SSO_EXTERNAL_USER",
            role_id=default_role.id if default_role else None,
            team_id=default_team.id if default_team else None,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Ensure email and name are updated for audit logs
        if not user.email:
            user.email = ms_email
        user.username = ms_display_name

    user.last_login_at = datetime.utcnow()
    db.commit()

    # 4. Issue FieldOps Application JWT Tokens
    access_token = create_access_token(user.id)
    refresh_token = create_access_token(user.id, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=Token)
async def refresh(current_user: User = Depends(get_current_user)):
    access_token = create_access_token(current_user.id)
    refresh_token = create_access_token(current_user.id, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserSchema)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
