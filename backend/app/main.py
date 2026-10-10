from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.core.data_loader import data_store
from app.api.v1.router import api_v1_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# PENANDA VERSI — kalau ini muncul di /health, berarti kode BARU sudah jalan
DEPLOY_MARKER = "cors-v3-20261010"

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"🚀 {settings.APP_NAME} starting up... [build={DEPLOY_MARKER}]")
    loaded_keys = data_store.get_all_keys()
    logger.info(f"✅ {len(loaded_keys)} dataset dimuat: {loaded_keys}")
    yield
    logger.info(f"👋 {settings.APP_NAME} shutting down...")

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered CV optimizer and cover letter generator.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# === CORS FINAL: daftar eksplisit (bukan wildcard) + credentials aman ===
# Domain Vercel disalin PERSIS dari pesan error-mu. Jangan tambah spasi/slash.
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://lamar-kerja-j7tb.vercel.app",
    "https://lamarkerja-production.up.railway.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router)

@app.get("/", tags=["Root"])
async def root():
    return {"message": f"Welcome to {settings.APP_NAME} API", "status": "Active", "docs": "/docs"}

@app.get("/health", tags=["Health"])
async def health_check():
    # Penanda versi: verifikasi deploy tanpa browser
    return {"status": "healthy", "build": DEPLOY_MARKER}

@app.get("/debug/data", tags=["Debug"])
async def debug_data():
    return {
        "loaded_datasets": data_store.get_all_keys(),
        "skills_categories_count": len(data_store.get("skills_database", {}).get("categories", [])),
        "prompt_keys": list(data_store.get("prompt_templates", {}).get("prompts", {}).keys()),
    }
