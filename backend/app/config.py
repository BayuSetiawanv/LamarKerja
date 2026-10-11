from pydantic import Field
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App
    APP_NAME: str = "LamarKerja AI"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://lamarkerja:secret123@localhost:5432/lamarkerja_db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin123"
    MINIO_BUCKET_NAME: str = "lamarkerja-files"
    
    # Ollama (Local LLM)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"

        # Konfigurasi AI Gateway (local vs cloud)
    AI_PROVIDER: str = "cloud"
    AI_BASE_URL: str = "https://api.groq.com/openai/v1"
    AI_API_KEY: str = Field(default="", env="AI_API_KEY")
    AI_MODEL: str = "openai/gpt-oss-120b"

    
    # Security
    SECRET_KEY: str = "super-secret-key-change-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days

    class Config:
        env_file = ".env"
        case_sensitive = True

# Menggunakan lru_cache agar config hanya di-load sekali (Singleton pattern)
@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
