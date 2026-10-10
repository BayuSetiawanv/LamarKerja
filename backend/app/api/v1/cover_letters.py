import uuid

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import select
import logging

from app.database import async_session_maker
from app.models.cv import CV
from app.models.user import User
from app.models.cover_letter import CoverLetter
from app.schemas.cover_letter import (
    CoverLetterRequest,
    CoverLetterResponse,
    CoverLetterDetail,
)
from app.services.cover_letter_generator import generate_cover_letter
from app.core.dependencies import get_current_user
from app.core.rate_limiter import enforce_daily_limit, record_usage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cover-letters", tags=["Cover Letter Generator"])


@router.post("/generate", response_model=CoverLetterResponse, status_code=status.HTTP_200_OK)
async def generate_cover_letter_endpoint(
    request: CoverLetterRequest,
    current_user: User = Depends(get_current_user),
):
    async with async_session_maker() as db:
        result = await db.execute(select(CV).where(CV.id == request.cv_id))
        cv = result.scalar_one_or_none()

        if not cv:
            raise HTTPException(status_code=404, detail="CV tidak ditemukan.")
        if cv.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Anda tidak berhak mengakses CV ini.")

        has_structured = bool(cv.structured_data)
        has_raw = bool(cv.raw_text and len(cv.raw_text.strip()) > 100)
        if not has_structured and not has_raw:
            raise HTTPException(
                status_code=400,
                detail="CV belum dianalisis oleh AI atau data tidak tersedia. Upload ulang CV Anda.",
            )

        # 🔥 CEK KUOTA sebelum aksi mahal (AI ~6000 token)
        await enforce_daily_limit(db, current_user.id, "cover_letter")

        # 🔥 BARU: Log bahasa yang dipilih user
        lang_label = "🇬🇧 EN" if request.language == "en" else "🇮🇩 ID"
        logger.info(
            f"📝 Generating cover letter [{lang_label}] untuk CV {cv.file_name} milik {current_user.email}..."
        )

        try:
            cover_letter_text = await generate_cover_letter(
                cv_data=cv.structured_data or {},
                job_description=request.job_description,
                company_name=request.company_name,
                target_role=request.target_role,
                raw_text=cv.raw_text or "",
                ats_result=cv.ats_result,
                language=request.language,   # ← BARU: pass bahasa ke service
            )
        except Exception as e:
            logger.error(f"Error saat generate cover letter: {type(e).__name__}: {e}")
            raise HTTPException(status_code=500, detail=f"Gagal generate cover letter: {str(e)}")

        # 🔥 SIMPAN ke database — terikat user_id (per-user, seperti skor ATS)
        new_letter = CoverLetter(
            user_id=current_user.id,
            cv_id=cv.id,
            company_name=request.company_name,
            target_role=request.target_role,
            job_description=request.job_description,
            letter_text=cover_letter_text,
        )
        db.add(new_letter)
        record_usage(db, current_user.id, "cover_letter")
        await db.commit()
        await db.refresh(new_letter)
        logger.info(f"✅ Cover letter {new_letter.id} [{lang_label}] tersimpan untuk {current_user.email}.")

        return CoverLetterResponse(
            id=str(new_letter.id),
            cover_letter=cover_letter_text,
            cv_id=cv.id,
            job_description_snippet=(
                request.job_description[:200] + "..."
                if len(request.job_description) > 200
                else request.job_description
            ),
            message=f"Cover letter [{lang_label}] berhasil di-generate dan tersimpan di riwayat Anda!",
        )


@router.get("/my-letters")
async def get_my_letters(current_user: User = Depends(get_current_user)):
    """Riwayat cover letter milik user yang sedang login (terisolasi per user)."""
    async with async_session_maker() as db:
        result = await db.execute(
            select(CoverLetter, CV.file_name)
            .outerjoin(CV, CoverLetter.cv_id == CV.id)
            .where(CoverLetter.user_id == current_user.id)
            .order_by(CoverLetter.created_at.desc())
        )
        rows = result.all()

        return [
            {
                "id": str(letter.id),
                "cv_id": str(letter.cv_id) if letter.cv_id else None,
                "cv_file_name": file_name,
                "company_name": letter.company_name,
                "target_role": letter.target_role,
                "letter_snippet": (
                    letter.letter_text[:200] + "..."
                    if len(letter.letter_text) > 200
                    else letter.letter_text
                ),
                "created_at": letter.created_at,
            }
            for letter, file_name in rows
        ]


@router.get("/{letter_id}", response_model=CoverLetterDetail)
async def get_letter_detail(
    letter_id: str,
    current_user: User = Depends(get_current_user),
):
    """Ambil satu cover letter lengkap — dengan validasi kepemilikan (403 jika bukan milikmu)."""
    try:
        letter_uuid = uuid.UUID(letter_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Cover letter tidak ditemukan.")

    async with async_session_maker() as db:
        result = await db.execute(
            select(CoverLetter, CV.file_name)
            .outerjoin(CV, CoverLetter.cv_id == CV.id)
            .where(CoverLetter.id == letter_uuid)
        )
        row = result.first()

        if not row:
            raise HTTPException(status_code=404, detail="Cover letter tidak ditemukan.")

        letter, file_name = row

        # 🔒 VALIDASI KEPEMILIKAN — pola yang sama dengan skor ATS
        if letter.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Anda tidak berhak mengakses cover letter ini.")

        return CoverLetterDetail(
            id=str(letter.id),
            cv_id=str(letter.cv_id) if letter.cv_id else None,
            cv_file_name=file_name,
            company_name=letter.company_name,
            target_role=letter.target_role,
            job_description=letter.job_description,
            letter_text=letter.letter_text,
            created_at=letter.created_at,
        )