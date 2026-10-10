import uuid
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, func, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base

class CV(Base):
    __tablename__ = "cvs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False) # Path di MinIO
    
    # Data hasil parsing AI
    raw_text: Mapped[str] = mapped_column(Text, nullable=True)
    structured_data: Mapped[dict] = mapped_column(JSONB, nullable=True) # Menyimpan JSON hasil ekstraksi AI
    
    # Skor ATS awal
    ats_score: Mapped[int] = mapped_column(Integer, nullable=True)
    ats_result = mapped_column(JSONB, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )