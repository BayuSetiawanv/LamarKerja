from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

class CVResponse(BaseModel):
    id: uuid.UUID
    file_name: str
    raw_text: Optional[str]
    structured_data: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True

class CVAnalysisResult(BaseModel):
    """Response saat user upload CV"""
    cv: CVResponse
    message: str = "CV berhasil diupload dan dianalisis oleh AI!"
    ats_score: Optional[int] = None
    ats_result: Optional[dict] = None   # ← BARU: hasil lengkap per CV