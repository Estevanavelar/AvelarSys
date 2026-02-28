# ========================================
# AVADMIN - Database Configuration (Neon)
# ========================================

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, AsyncEngine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy import event, text

from .config import settings

# Create async engine with Neon PostgreSQL
# Garantir que a URL use asyncpg explicitamente
database_url = settings.database_url
if not database_url.startswith("postgresql+asyncpg://"):
    # Se não tiver o prefixo asyncpg, adicionar
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")

# Criar engine (sem query parameters problemáticos)
engine: AsyncEngine = create_async_engine(
    database_url,
    echo=settings.debug,  # Log SQL queries in debug mode
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_timeout=settings.database_pool_timeout,
    pool_pre_ping=True,  # Validate connections before use
)

# Create async session factory
AsyncSessionFactory = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=True,
    autocommit=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Database session dependency for FastAPI
    
    Usage:
        @app.get("/users")
        async def get_users(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(User))
            return result.scalars().all()
    """
    async with AsyncSessionFactory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_database():
    """
    Initialize database connection and test connectivity
    Called during application startup
    """
    try:
        from sqlalchemy import text
        async with engine.begin() as conn:
            # Test connection
            await conn.execute(text("SELECT 1"))
            print("✅ Connected to Neon PostgreSQL (AvAdmin/Auth)")
            
            # Create all tables (alternative to Alembic for development)
            # from ..models import Base
            # await conn.run_sync(Base.metadata.create_all)
            
    except Exception as e:
        print(f"❌ Failed to connect to Neon PostgreSQL: {str(e)}")
        raise

async def close_database():
    """
    Close database connections
    Called during application shutdown
    """
    await engine.dispose()
    print("🔌 Disconnected from Neon PostgreSQL")

# Export for convenience
__all__ = [
    "engine",
    "AsyncSessionFactory", 
    "get_db",
    "init_database",
    "close_database"
]