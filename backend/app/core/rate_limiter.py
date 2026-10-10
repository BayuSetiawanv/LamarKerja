from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.usage_log import UsageLog

# ===== Kebijakan batas harian per user =====
DAILY_LIMITS = {
    "upload_cv": 20,
    "ats_score": 20,
    "cover_letter": 20,
}

ACTION_LABELS = {
    "upload_cv": "upload CV",
    "ats_score": "skor ATS",
    "cover_letter": "cover letter",
}

WIB = timezone(timedelta(hours=7))


def _start_of_today_wib() -> datetime:
    """Tengah malam hari ini dalam WIB, dikonversi ke UTC untuk perbandingan di DB."""
    now_wib = datetime.now(WIB)
    start_wib = now_wib.replace(hour=0, minute=0, second=0, microsecond=0)
    return start_wib.astimezone(timezone.utc)


async def get_today_usage(db: AsyncSession, user_id, action: str) -> int:
    """Hitung berapa kali user melakukan aksi ini sejak tengah malam WIB."""
    start = _start_of_today_wib()
    result = await db.execute(
        select(func.count())
        .select_from(UsageLog)
        .where(
            UsageLog.user_id == user_id,
            UsageLog.action == action,
            UsageLog.created_at >= start,
        )
    )
    return result.scalar() or 0


async def enforce_daily_limit(db: AsyncSession, user_id, action: str) -> None:
    """Lempar 429 jika kuota harian habis. Panggil SEBELUM aksi mahal (AI)."""
    limit = DAILY_LIMITS.get(action)
    if limit is None:
        return
    used = await get_today_usage(db, user_id, action)
    if used >= limit:
        label = ACTION_LABELS.get(action, action)
        raise HTTPException(
            status_code=429,
            detail=(
                f"Batas harian {label} tercapai ({limit}x/hari). "
                "Kuota akan reset tengah malam WIB. Coba lagi besok!"
            ),
        )


def record_usage(db: AsyncSession, user_id, action: str) -> None:
    """Catat 1 pemakaian SUKSES. Commit dilakukan oleh pemanggil."""
    db.add(UsageLog(user_id=user_id, action=action))