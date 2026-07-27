from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sahyog Healthcare API"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "sahyog_very_secret_key_change_me_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Loaded from backend/.env — falls back to local SQLite if not set
    DATABASE_URL: str = "sqlite:///./sahyog.db"

    # Supabase Storage Configurations for RAG Guideline Documents
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "rag-documents"

    # Gemini API Key
    GEMINI_API_KEY: str = ""

    # CORS Allowed origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
