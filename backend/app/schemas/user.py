from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
import uuid

# Schema untuk Request (User input saat register)
class UserCreate(BaseModel):
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=6, max_length=100, description="Password (min 6 karakter)")
    full_name: Optional[str] = Field(None, max_length=255, description="Nama lengkap")

# Schema untuk Response (Data user yang dikembalikan)
class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True  # Agar bisa convert dari SQLAlchemy model

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None