from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.core.data_loader import data_store
from app.api.v1.router import api_v1_router  # <-- TAMBAHKAN INI
import logging

# Setup logging standar Senior Engineer
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered CV optimizer and cover letter generator.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "https://lamar-kerja-j7tb.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 router
app.include_router(api_v1_router)

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "status": "Active",
        "docs": "/docs"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "environment": "development"}

@app.get("/debug/data", tags=["Debug"])
async def debug_data():
    return {
        "loaded_datasets": data_store.get_all_keys(),
        "skills_categories_count": len(data_store.get("skills_database", {}).get("categories", [])),
        "prompt_keys": list(data_store.get("prompt_templates", {}).get("prompts", {}).keys())
    }

@app.on_event("startup")
async def startup_event():
    logger.info(f"🚀 {settings.APP_NAME} is starting up...")
    logger.info(f"🧠 Memuat referensi data ke memori...")
    loaded_keys = data_store.get_all_keys()
    logger.info(f" Total {len(loaded_keys)} dataset berhasil dimuat: {loaded_keys}")
    logger.info(f"📚 Swagger UI available at: http://localhost:8000/docs")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info(f"👋 {settings.APP_NAME} is shutting down...")
