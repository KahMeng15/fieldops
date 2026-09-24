import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FieldOps"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/appdb")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretkey")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 8
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    MASTER_KEY_PATH: str = os.getenv("MASTER_KEY_PATH", "/tmp/master.key")
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "minioadmin")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "minioadmin")
    AWS_S3_ENDPOINT: str = os.getenv("AWS_S3_ENDPOINT", "http://localhost:9000")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Microsoft Entra ID / Azure AD SSO Settings
    AZURE_CLIENT_ID: str = os.getenv("AZURE_CLIENT_ID", "")
    AZURE_CLIENT_SECRET: str = os.getenv("AZURE_CLIENT_SECRET", "")
    AZURE_TENANT_ID: str = os.getenv("AZURE_TENANT_ID", "")
    AZURE_REDIRECT_URI: str = os.getenv("AZURE_REDIRECT_URI", "http://localhost:3000/auth/microsoft/callback")

settings = Settings()
