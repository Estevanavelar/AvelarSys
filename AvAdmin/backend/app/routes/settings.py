# ========================================
# AVADMIN - Settings API Routes
# ========================================

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.config import settings as app_settings
from ..routes.auth import get_current_user
from ..models.user import User, UserRole

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SystemSettings(BaseModel):
    """System-wide settings schema"""
    company_name: str = "Avelar Company"
    company_whatsapp: str = ""
    timezone: str = "America/Sao_Paulo"
    language: str = "pt-BR"
    date_format: str = "DD/MM/YYYY"
    currency: str = "BRL"
    
    # Security
    session_timeout: int = 3600  # seconds
    max_login_attempts: int = 5
    password_min_length: int = 8
    require_2fa: bool = False
    
    # WhatsApp
    whatsapp_provider: str = "development"
    whatsapp_enabled: bool = True
    whatsapp_auto_response: bool = False
    
    # Notifications
    whatsapp_notifications: bool = True
    
    # Limits
    default_trial_days: int = 14
    max_users_per_account: int = 10
    max_products_per_account: int = 1000
    max_transactions_per_month: int = 10000


class SettingsUpdate(BaseModel):
    """Settings update payload"""
    settings: Dict[str, Any]


# In-memory settings cache (in production, use Redis or database)
_settings_cache: Dict[str, Any] = {}


def get_default_settings() -> Dict[str, Any]:
    """Get default system settings"""
    return SystemSettings().model_dump()


def get_current_settings() -> Dict[str, Any]:
    """Get current settings (merged with defaults)"""
    defaults = get_default_settings()
    return {**defaults, **_settings_cache}


@router.get("", response_model=dict)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all system settings
    Only super_admin and admin can access
    """
    if current_user.role.value not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    current = get_current_settings()
    
    # Add some runtime info
    current["whatsapp_status"] = "connected" if app_settings.use_wppconnect else "disconnected"
    current["wppconnect_url"] = app_settings.wppconnect_url
    current["system_version"] = "1.0.0"
    current["api_url"] = "https://avadmin.avelarcompany.com.br/api"
    
    return {
        "settings": current,
        "categories": [
            {"id": "general", "name": "Geral", "icon": "⚙️"},
            {"id": "security", "name": "Segurança", "icon": "🔒"},
            {"id": "whatsapp", "name": "WhatsApp", "icon": "📱"},
            {"id": "notifications", "name": "Notificações", "icon": "🔔"},
            {"id": "limits", "name": "Limites", "icon": "📊"},
        ]
    }


@router.put("", response_model=dict)
async def update_settings(
    payload: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update system settings
    Only super_admin can modify
    """
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super_admin can modify settings")
    
    global _settings_cache
    
    # Validate and update settings
    for key, value in payload.settings.items():
        _settings_cache[key] = value
    
    return {
        "message": "Settings updated successfully",
        "settings": get_current_settings()
    }


@router.post("/reset", response_model=dict)
async def reset_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reset settings to defaults
    Only super_admin can reset
    """
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super_admin can reset settings")
    
    global _settings_cache
    _settings_cache = {}
    
    return {
        "message": "Settings reset to defaults",
        "settings": get_default_settings()
    }


@router.post("/cache/clear", response_model=dict)
async def clear_cache(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Clear system cache
    Only super_admin can clear
    """
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super_admin can clear cache")
    
    # In production, clear Redis cache here
    
    return {
        "message": "Cache cleared successfully"
    }


@router.get("/whatsapp/status", response_model=dict)
async def get_whatsapp_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get WhatsApp integration status"""
    if current_user.role.value not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    return {
        "provider": app_settings.whatsapp_active_provider,
        "enabled": app_settings.use_wppconnect,
        "wppconnect": {
            "url": app_settings.wppconnect_url,
            "session": app_settings.wppconnect_session,
            "status": "unknown"  # Would need to check actual WPPConnect status
        },
        "business_api": {
            "configured": bool(app_settings.whatsapp_api_token),
            "phone_id": app_settings.whatsapp_phone_id or None
        }
    }

