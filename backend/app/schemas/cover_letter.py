import uuid
from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field


class CoverLetterRequest(BaseModel):
    """Request untuk generate cover letter"""
    cv_id: uuid.UUID = Field(..., description="ID dari CV yang sudah diupload")
    job_description: str = Field(..., min_length=50, description="Teks lengkap lowongan kerja")
    company_name: Optional[str] = Field(None, description="Nama perusahaan (opsional)")
    target_role: Optional[str] = Field(None, description="Posisi yang dilamar (opsional)")
    language: Literal["id", "en"] = Field(   # ← BARU: pilihan bahasa, default Indonesia
        "id",
        description="Bahasa cover letter: 'id' untuk Indonesia, 'en' untuk English"
    )


class CoverLetterResponse(BaseModel):
    """Response berisi cover letter yang di-generate AI"""
    cover_letter: str = Field(..., description="Cover letter dalam format plain text")
    cv_id: uuid.UUID
    job_description_snippet: str
    message: str = "Cover letter berhasil di-generate oleh AI!"
    id: Optional[str] = None


class CoverLetterListItem(BaseModel):
    id: str
    cv_id: Optional[str] = None
    cv_file_name: Optional[str] = None
    company_name: Optional[str] = None
    target_role: Optional[str] = None
    letter_snippet: str = ""
    created_at: datetime


class CoverLetterDetail(BaseModel):
    id: str
    cv_id: Optional[str] = None
    cv_file_name: Optional[str] = None
    company_name: Optional[str] = None
    target_role: Optional[str] = None
    job_description: Optional[str] = None
    letter_text: str
    created_at: datetime