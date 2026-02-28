# ========================================
# AVADMIN - Dashboard API Routes
# ========================================

from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.config import settings
from ..routes.auth import get_current_user
from ..models.account import Account, AccountStatus
from ..models.user import User, UserRole

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=dict)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get dashboard statistics
    """
    if current_user.role.value not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Get account counts
    total_accounts_result = await db.execute(select(func.count()).select_from(Account))
    total_accounts = total_accounts_result.scalar() or 0
    
    active_accounts_result = await db.execute(
        select(func.count()).select_from(Account).where(Account.status == AccountStatus.active)
    )
    active_accounts = active_accounts_result.scalar() or 0
    
    trial_accounts_result = await db.execute(
        select(func.count()).select_from(Account).where(Account.status == AccountStatus.trial)
    )
    trial_accounts = trial_accounts_result.scalar() or 0
    
    suspended_accounts_result = await db.execute(
        select(func.count()).select_from(Account).where(Account.status == AccountStatus.suspended)
    )
    suspended_accounts = suspended_accounts_result.scalar() or 0
    
    # Get user counts
    total_users_result = await db.execute(select(func.count()).select_from(User))
    total_users = total_users_result.scalar() or 0
    
    active_users_result = await db.execute(
        select(func.count()).select_from(User).where(User.is_active == True)
    )
    active_users = active_users_result.scalar() or 0
    
    # WhatsApp status - check if WPPConnect is configured
    whatsapp_status = "disconnected"
    if settings.use_wppconnect and settings.wppconnect_url:
        whatsapp_status = "waiting"  # Default to waiting, frontend will update via WPPConnect API
    
    # Get recent activities
    recent_activities = []
    
    # Recent users (last 5)
    recent_users_result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(5)
    )
    recent_users = recent_users_result.scalars().all()
    
    for user in recent_users:
        if user.created_at:
            now = datetime.now(timezone.utc) if user.created_at.tzinfo else datetime.utcnow()
            time_diff = now - user.created_at
            if time_diff.days > 0:
                time_str = f"{time_diff.days} dias atrás"
            elif time_diff.seconds > 3600:
                time_str = f"{time_diff.seconds // 3600} horas atrás"
            elif time_diff.seconds > 60:
                time_str = f"{time_diff.seconds // 60} min atrás"
            else:
                time_str = "agora"
        else:
            time_str = "N/A"
            
        recent_activities.append({
            "action": "Usuário criado",
            "user": user.full_name,
            "time": time_str,
            "icon": "👤",
            "color": "bg-blue-100 text-blue-700"
        })
    
    # Recent accounts (last 5)
    recent_accounts_result = await db.execute(
        select(Account).order_by(Account.created_at.desc()).limit(5)
    )
    recent_accounts = recent_accounts_result.scalars().all()
    
    for account in recent_accounts:
        if account.created_at:
            now = datetime.now(timezone.utc) if account.created_at.tzinfo else datetime.utcnow()
            time_diff = now - account.created_at
            if time_diff.days > 0:
                time_str = f"{time_diff.days} dias atrás"
            elif time_diff.seconds > 3600:
                time_str = f"{time_diff.seconds // 3600} horas atrás"
            elif time_diff.seconds > 60:
                time_str = f"{time_diff.seconds // 60} min atrás"
            else:
                time_str = "agora"
        else:
            time_str = "N/A"
            
        recent_activities.append({
            "action": "Conta criada",
            "user": account.company_name,
            "time": time_str,
            "icon": "🏢",
            "color": "bg-green-100 text-green-700"
        })
    
    return {
        "total_accounts": total_accounts,
        "active_accounts": active_accounts,
        "trial_accounts": trial_accounts,
        "suspended_accounts": suspended_accounts,
        "total_users": total_users,
        "active_users": active_users,
        "whatsapp_status": whatsapp_status,
        "system_health": "healthy",
        "recent_activities": recent_activities,
        "last_updated": datetime.utcnow().isoformat()
    }


@router.get("/recent-activity", response_model=dict)
async def get_recent_activity(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get recent system activity
    """
    if current_user.role.value not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Get recent accounts
    recent_accounts_result = await db.execute(
        select(Account).order_by(Account.created_at.desc()).limit(5)
    )
    recent_accounts = recent_accounts_result.scalars().all()
    
    # Get recent users
    recent_users_result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(5)
    )
    recent_users = recent_users_result.scalars().all()
    
    activities = []
    
    for account in recent_accounts:
        activities.append({
            "type": "account_created",
            "icon": "🏢",
            "message": f"Nova conta criada: {account.company_name}",
            "timestamp": account.created_at.isoformat() if account.created_at else None,
            "entity_id": str(account.id),
            "entity_type": "account"
        })
    
    for user in recent_users:
        activities.append({
            "type": "user_created",
            "icon": "👤",
            "message": f"Novo usuário: {user.full_name}",
            "timestamp": user.created_at.isoformat() if user.created_at else None,
            "entity_id": str(user.id),
            "entity_type": "user"
        })
    
    # Sort by timestamp
    activities.sort(key=lambda x: x.get("timestamp") or "", reverse=True)
    
    return {
        "activities": activities[:limit],
        "total": len(activities)
    }


@router.get("/charts/accounts", response_model=dict)
async def get_accounts_chart_data(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get chart data for accounts over time
    """
    if current_user.role.value not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Generate sample data for chart
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    data = []
    current = start_date
    cumulative = 0
    
    while current <= end_date:
        # Simulate some growth
        cumulative += 1 if current.day % 3 == 0 else 0
        data.append({
            "date": current.strftime("%Y-%m-%d"),
            "total": cumulative,
            "new": 1 if current.day % 3 == 0 else 0
        })
        current += timedelta(days=1)
    
    return {
        "data": data,
        "period": f"{days} days",
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d")
    }


@router.get("/quick-stats", response_model=dict)
async def get_quick_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get quick stats for dashboard widgets
    """
    if current_user.role.value not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Simulated metrics
    return {
        "mrr": 15680.50,
        "mrr_growth": 12.5,
        "churn_rate": 2.3,
        "avg_revenue_per_user": 89.90,
        "trial_conversion_rate": 45.2,
        "active_sessions": 127,
        "api_calls_today": 45230,
        "storage_used_gb": 23.5,
        "storage_limit_gb": 100
    }

