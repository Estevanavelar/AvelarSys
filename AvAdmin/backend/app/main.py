# ========================================
# AVADMIN - FastAPI Main Application
# ========================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .core.config import settings
from .core.database import init_database, close_database
from .routes.internal_api import router as internal_router
from .routes.auth import router as auth_router
from .routes.auth_simple import router as auth_simple_router
from .routes.whatsapp import router as whatsapp_router
from .routes.accounts import router as accounts_router
from .routes.users import router as users_router
from .routes.settings import router as settings_router
from .routes.plans import router as plans_router
from .routes.dashboard import router as dashboard_router
from .routes.billing import router as billing_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events
    Handle startup and shutdown
    """
    # Startup
    print(f"🚀 Starting {settings.app_name} v{settings.app_version}")
    print(f"🌍 Environment: {settings.environment}")
    
    # Initialize database
    await init_database()
    
    yield
    
    # Shutdown
    print(f"🛑 Shutting down {settings.app_name}")
    await close_database()

# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AvAdmin - SaaS Administration API",
    debug=settings.debug,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_simple_router)  # Temporary simple auth for testing
app.include_router(auth_router)
app.include_router(whatsapp_router)  # WhatsApp management and webhook
app.include_router(internal_router)
app.include_router(accounts_router)  # Accounts management
app.include_router(users_router)  # Users management
app.include_router(settings_router)  # Settings management
app.include_router(plans_router)  # Plans management
app.include_router(dashboard_router)  # Dashboard stats
app.include_router(billing_router)  # Billing and invoices

# Basic health check
@app.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment
    }

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health",
        "internal_apis": "/api/internal"
    }

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,  # Porta fixa conforme PORTS.md
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )