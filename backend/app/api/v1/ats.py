from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import select
import logging

from app.database import async_session_maker
from app.models.cv import CV
from app.models.user import User
from app.schemas.ats import JobDescriptionInput, ATSScoreResult
from app.services.llm_ats_scorer import evaluate_cv_with_llm
from app.core.dependencies import get_current_user
from app.core.rate_limiter import enforce_daily_limit, record_usage  # ← BARU

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ats", tags=["ATS Scoring"])


@router.post("/score", response_model=ATSScoreResult, status_code=status.HTTP_200_OK)
async def score_cv_against_job(
    input_data: JobDescriptionInput,
    current_user: User = Depends(get_current_user),
):
    async with async_session_maker() as db:
        # 1. Ambil CV dari database
        result = await db.execute(select(CV).where(CV.id == input_data.cv_id))
        cv = result.scalar_one_or_none()

        # 2. Validasi keberadaan & kepemilikan
        if not cv:
            raise HTTPException(status_code=404, detail="CV tidak ditemukan.")
        if cv.user_id != current_user.id:
            raise HTTPException(
                status_code=403, detail="Anda tidak berhak mengakses CV ini."
            )

        # 3. Validasi minimal salah satu sumber data ada
        has_structured = bool(cv.structured_data)
        has_raw = bool(cv.raw_text and len(cv.raw_text.strip()) > 100)

        if not has_structured and not has_raw:
            raise HTTPException(
                status_code=400,
                detail="CV belum dianalisis oleh AI atau data tidak tersedia.",
            )

        # 4. 🔥 CEK KUOTA sebelum aksi mahal (AI scoring ~5000 token)
        #    Jika user kena limit, tolak TANPA buang token Groq
        await enforce_daily_limit(db, current_user.id, "ats_score")

        logger.info(f"🧮 Memulai Smart ATS Scoring (LLM) untuk CV {cv.file_name}...")
        logger.info(f"   Structured data: {'✅' if has_structured else '❌'}")
        logger.info(f"   Raw text: {'✅ ' + str(len(cv.raw_text)) + ' chars' if has_raw else '❌'}")

        try:
            # 5. Panggil LLM Scorer
            ai_evaluation = await evaluate_cv_with_llm(
                cv_data=cv.structured_data or {},
                job_description=input_data.job_description,
                raw_text=cv.raw_text or "",
            )
        except Exception as e:
            logger.error(f"Error saat LLM scoring: {type(e).__name__}: {e}")
            raise HTTPException(
                status_code=500, detail=f"Gagal melakukan scoring AI: {str(e)}"
            )

        # 6. Simpan hasil + CATAT pemakaian (hanya kalau AI sukses)
        cv.ats_score = ai_evaluation.get("overall_score")
        cv.ats_result = ai_evaluation
        record_usage(db, current_user.id, "ats_score")   # 🔥 CATAT (sukses)
        await db.commit()
        await db.refresh(cv)

        # 7. Return hasil
        return ATSScoreResult(**ai_evaluation)