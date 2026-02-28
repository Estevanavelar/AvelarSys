# ========================================
# AVADMIN - WhatsApp Web Automation Admin Routes
# ========================================

from typing import List, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from ..core.database import get_db
from ..routes.auth import get_current_user
from ..models import User, UserRole
from ..services.whatsapp import whatsapp_manager

router = APIRouter(prefix="/api/whatsapp-auto", tags=["WhatsApp Automation"])

# ==========================================
# SCHEMAS
# ==========================================

class AutomationStatus(BaseModel):
    is_running: bool
    is_connected: bool
    session_path: str
    pending_messages: int
    failed_messages: int
    sent_today: int
    last_activity: str = None
    config: Dict[str, Any]

class QueueMessage(BaseModel):
    id: str
    type: str
    phone: str
    message: str
    priority: str
    created_at: str
    attempts: int
    status: str
    error: str = None
    sent_at: str = None

class SendMessageRequest(BaseModel):
    phone: str
    message: str
    priority: str = "normal"

class AutomationConfig(BaseModel):
    session_check_interval: int = 30
    message_send_delay: int = 2
    max_retry_attempts: int = 3
    auto_recovery_enabled: bool = True
    headless_mode: bool = False
    keep_alive_enabled: bool = True

# ==========================================
# ADMIN GUARD
# ==========================================

async def require_admin(current_user: User = Depends(get_current_user)):
    """Require admin or super admin role"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado: apenas administradores")
    return current_user

# ==========================================
# AUTOMATION CONTROL
# ==========================================

@router.post("/start", response_model=dict)
async def start_whatsapp_automation(
    background_tasks: BackgroundTasks,
    admin: User = Depends(require_admin)
):
    """Start WhatsApp Web automation"""
    
    if whatsapp_manager.is_running:
        return {"message": "WhatsApp automation já está rodando", "status": "already_running"}
    
    # Start in background
    background_tasks.add_task(whatsapp_manager.start)
    
    return {
        "message": "WhatsApp automation iniciando...",
        "status": "starting",
        "instructions": [
            "1. Aguarde WhatsApp Web abrir",
            "2. Escaneie QR Code com celular (se necessário)",
            "3. Mantenha celular conectado sempre",
            "4. Sistema ficará 100% automático"
        ]
    }

@router.post("/stop", response_model=dict)
async def stop_whatsapp_automation(admin: User = Depends(require_admin)):
    """Stop WhatsApp Web automation"""
    
    await whatsapp_manager.stop()
    
    return {"message": "WhatsApp automation parado com sucesso", "status": "stopped"}

@router.get("/status", response_model=AutomationStatus)
async def get_automation_status(admin: User = Depends(require_admin)):
    """Get WhatsApp automation status"""
    
    status = whatsapp_manager.get_status()
    return AutomationStatus(**status)

@router.post("/restart", response_model=dict)
async def restart_whatsapp_automation(
    background_tasks: BackgroundTasks,
    admin: User = Depends(require_admin)
):
    """Restart WhatsApp automation"""
    
    # Stop first
    await whatsapp_manager.stop()
    
    # Start again
    background_tasks.add_task(whatsapp_manager.start)
    
    return {"message": "WhatsApp automation reiniciando...", "status": "restarting"}

# ==========================================
# QUEUE MANAGEMENT
# ==========================================

@router.get("/queue", response_model=List[QueueMessage])
async def get_message_queue(
    status_filter: str = None,
    admin: User = Depends(require_admin)
):
    """Get message queue (all, pending, sent, failed)"""
    
    queue = whatsapp_manager.bot.load_queue()
    
    # Filter by status if requested
    if status_filter:
        queue = [msg for msg in queue if msg["status"] == status_filter]
    
    # Sort by creation time (newest first)
    queue.sort(key=lambda x: x["created_at"], reverse=True)
    
    # Return last 100 messages
    return [QueueMessage(**msg) for msg in queue[-100:]]

@router.post("/queue/send-message", response_model=dict)
async def queue_custom_message(
    request: SendMessageRequest,
    admin: User = Depends(require_admin)
):
    """Add custom message to queue"""
    
    message_id = whatsapp_manager.bot.add_to_queue(
        phone=request.phone,
        message=request.message,
        message_type="custom",
        priority=request.priority
    )
    
    return {
        "message": "Mensagem adicionada à fila",
        "message_id": message_id,
        "estimated_send": "5-10 segundos (se conectado)"
    }

@router.post("/queue/{message_id}/retry", response_model=dict)
async def retry_failed_message(
    message_id: str,
    admin: User = Depends(require_admin)
):
    """Retry failed message"""
    
    queue = whatsapp_manager.bot.load_queue()
    
    # Find message
    message = None
    for msg in queue:
        if msg["id"] == message_id:
            message = msg
            break
    
    if not message:
        raise HTTPException(status_code=404, detail="Mensagem não encontrada")
    
    if message["status"] not in ["failed", "error"]:
        raise HTTPException(status_code=400, detail="Mensagem não está com falha")
    
    # Reset message to pending
    message["status"] = "pending"
    message["attempts"] = 0
    message["error"] = None
    
    whatsapp_manager.bot.save_queue(queue)
    
    return {"message": "Mensagem recolocada na fila", "message_id": message_id}

@router.delete("/queue/{message_id}", response_model=dict)
async def delete_queued_message(
    message_id: str,
    admin: User = Depends(require_admin)
):
    """Delete message from queue"""
    
    queue = whatsapp_manager.bot.load_queue()
    original_length = len(queue)
    
    # Remove message
    queue = [msg for msg in queue if msg["id"] != message_id]
    
    if len(queue) == original_length:
        raise HTTPException(status_code=404, detail="Mensagem não encontrada")
    
    whatsapp_manager.bot.save_queue(queue)
    
    return {"message": "Mensagem removida da fila", "message_id": message_id}

# ==========================================
# CONFIGURATION
# ==========================================

@router.get("/config", response_model=AutomationConfig)
async def get_automation_config(admin: User = Depends(require_admin)):
    """Get automation configuration"""
    
    config = whatsapp_manager.bot.load_config()
    return AutomationConfig(**config)

@router.put("/config", response_model=dict)
async def update_automation_config(
    config: AutomationConfig,
    admin: User = Depends(require_admin)
):
    """Update automation configuration"""
    
    whatsapp_manager.bot.save_config(config.dict())
    
    return {"message": "Configuração atualizada com sucesso"}

# ==========================================
# STATISTICS & MONITORING
# ==========================================

@router.get("/stats", response_model=dict)
async def get_whatsapp_stats(admin: User = Depends(require_admin)):
    """Get WhatsApp automation statistics"""
    
    queue = whatsapp_manager.bot.load_queue()
    
    # Calculate stats
    total_messages = len(queue)
    sent_messages = len([msg for msg in queue if msg["status"] == "sent"])
    failed_messages = len([msg for msg in queue if msg["status"] == "failed"])
    pending_messages = len([msg for msg in queue if msg["status"] == "pending"])
    
    # Today's stats
    today = datetime.now().date()
    today_messages = [
        msg for msg in queue 
        if datetime.fromisoformat(msg.get("sent_at", "1970-01-01T00:00:00")).date() == today
    ]
    
    # Message types
    types_count = {}
    for msg in queue:
        msg_type = msg.get("type", "unknown")
        types_count[msg_type] = types_count.get(msg_type, 0) + 1
    
    return {
        "total_messages": total_messages,
        "sent_messages": sent_messages,
        "failed_messages": failed_messages,
        "pending_messages": pending_messages,
        "success_rate": round((sent_messages / total_messages * 100) if total_messages > 0 else 0, 2),
        "today_sent": len(today_messages),
        "message_types": types_count,
        "last_24h": len([
            msg for msg in queue 
            if datetime.fromisoformat(msg.get("created_at", "1970-01-01T00:00:00")) > datetime.now() - timedelta(hours=24)
        ]),
        "session_uptime": whatsapp_manager.is_running,
        "connection_status": whatsapp_manager.bot.is_connected
    }

@router.get("/health")
async def whatsapp_automation_health():
    """WhatsApp automation health check"""
    
    status = whatsapp_manager.get_status()
    
    return {
        "status": "healthy" if status["is_running"] and status["is_connected"] else "unhealthy",
        "automation": "running" if status["is_running"] else "stopped",
        "whatsapp": "connected" if status["is_connected"] else "disconnected",
        "pending_messages": status["pending_messages"],
        "last_activity": status["last_activity"]
    }