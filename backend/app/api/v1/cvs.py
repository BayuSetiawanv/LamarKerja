from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.database import async_session_maker
from app.models.cv import CV
from sqlalchemy import select
from app.models.user import User
from app.schemas.cv import CVResponse, CVAnalysisResult
from app.services.cv_analyzer import analyze_cv
from app.core.dependencies import get_current_user
from app.core.rate_limiter import enforce_daily_limit, record_usage  # ← BARU

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cvs", tags=["CV Management"])


@router.post("/upload", response_model=CVAnalysisResult, status_code=status.HTTP_201_CREATED)
async def upload_and_analyze_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    # 1. Validasi file (cepat, tanpa DB)
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Hanya file PDF yang diperbolehkan.")

    # 2. 🔥 CEK KUOTA SEBELUM aksi mahal (AI analyzer)
    #    Jika user sudah kena limit, kita buang request TANPA menghabiskan token Groq
    async with async_session_maker() as db:
        await enforce_daily_limit(db, current_user.id, "upload_cv")

    # 3. Baca file & panggil AI (mahal: ~2000 token, ~10-20 detik)
    file_bytes = await file.read()

    try:
        analysis_result = await analyze_cv(file_bytes)
    except Exception as e:
        logger.error(f"Error saat analisis CV: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal menganalisis CV: {str(e)}")

    # 4. Simpan ke DB + CATAT pemakaian (hanya kalau sukses)
    async with async_session_maker() as db:
        new_cv = CV(
            user_id=current_user.id,
            file_name=file.filename,
            file_url="local://memory",
            raw_text=analysis_result["raw_text"],
            structured_data=analysis_result["structured_data"],
        )

        db.add(new_cv)
        record_usage(db, current_user.id, "upload_cv")  # 🔥 catat sukses
        await db.commit()
        await db.refresh(new_cv)

        logger.info(f"✅ CV {file.filename} milik {current_user.email} tersimpan.")
        return CVAnalysisResult(
            cv=CVResponse.model_validate(new_cv),
            message="Sukses! AI telah mengekstrak data dari CV Anda.",
        )


@router.get("/my-cvs")
async def get_my_cvs(current_user: User = Depends(get_current_user)):
    """Ambil semua CV milik user yang sedang login, urut dari yang terbaru."""
    async with async_session_maker() as db:
        result = await db.execute(
            select(CV)
            .where(CV.user_id == current_user.id)
            .order_by(CV.created_at.desc())
        )
        cvs = result.scalars().all()

        return [
            {
                "id": cv.id,
                "file_name": cv.file_name,
                "ats_score": cv.ats_score,
                "ats_result": cv.ats_result,
                "created_at": cv.created_at,
                "structured_data": cv.structured_data,
            }
            for cv in cvs
        ]
        