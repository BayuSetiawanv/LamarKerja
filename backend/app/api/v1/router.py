from fastapi import APIRouter
from app.api.v1 import auth, cvs, ats, cover_letters  

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth.router)
api_v1_router.include_router(cvs.router)
api_v1_router.include_router(ats.router)
api_v1_router.include_router(cover_letters.router)  