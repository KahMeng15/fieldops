from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.models import User
from app.schemas import LoginSchema, Token, User as UserSchema
from app.core.security import verify_password, create_access_token
from app.api.deps import get_current_user
from datetime import datetime, timedelta
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

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
