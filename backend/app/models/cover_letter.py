import uuid

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class CoverLetter(Base):
    __tablename__ = "cover_letters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    cv_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cvs.id", ondelete="CASCADE"),
        nullable=True,
    )
    company_name = Column(String, nullable=True)
    target_role = Column(String, nullable=True)
    job_description = Column(Text, nullable=True)
    letter_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())