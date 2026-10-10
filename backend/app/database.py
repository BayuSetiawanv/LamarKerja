from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Membuat engine database async
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG, # Cetak query SQL di terminal jika DEBUG=True
    pool_pre_ping=True,  # Cek koneksi sebelum dipakai
)

# Membuat session factory
async_session_maker = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Base class untuk semua model SQLAlchemy
class Base(DeclarativeBase):
    pass

# Dependency untuk mendapatkan session di FastAPI endpoint
async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
from sqlalchemy.orm import DeclarativeBase
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Membuat engine database async
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG, # Cetak query SQL di terminal jika DEBUG=True
    pool_pre_ping=True,  # Cek koneksi sebelum dipakai
)

# Membuat session factory
async_session_maker = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Base class untuk semua model SQLAlchemy
class Base(DeclarativeBase):
    pass

# Dependency untuk mendapatkan session di FastAPI endpoint
async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()