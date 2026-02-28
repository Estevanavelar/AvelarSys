from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from contextlib import asynccontextmanager
import os
import json
from typing import List, Optional
from datetime import datetime

from app.config import settings
from app.models import (
    CampaignCreate, Campaign, CampaignStatus, 
    Message, MessageStatus, CampaignStats, SystemStatus, WPPStatus,
    Contact
)
from app.database import db
from app.csv_reader import ContactReader, TemplateProcessor
from app.sender import sender
from app.wpp_manager import wpp_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerenciamento de ciclo de vida da aplicação"""
    # Startup
    await db.initialize()
    yield
    # Shutdown
    await sender.close()


app = FastAPI(
    title="TurboZap",
    description="Disparador de Mensagens WhatsApp",
    version="1.0.0",
    lifespan=lifespan
)

# Static files e templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# ==========================================
# ROTAS WEB (Painel)
# ==========================================

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Página principal - Dashboard"""
    campaigns = await db.get_campaigns()
    running_count = sum(1 for c in campaigns if c.status == CampaignStatus.RUNNING)
    
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "campaigns": campaigns,
        "running_count": running_count,
        "settings": settings
    })


@app.get("/campaigns/new", response_class=HTMLResponse)
async def new_campaign_page(request: Request):
    """Página de criação de campanha"""
    return templates.TemplateResponse("new_campaign.html", {
        "request": request,
        "settings": settings
    })


@app.get("/campaigns/{campaign_id}", response_class=HTMLResponse)
async def campaign_detail(request: Request, campaign_id: int):
    """Página de detalhes da campanha"""
    campaign = await db.get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    
    stats = await db.get_messages_stats(campaign_id)
    messages = await db.get_messages(campaign_id, limit=100)
    
    return templates.TemplateResponse("campaign_detail.html", {
        "request": request,
        "campaign": campaign,
        "stats": stats,
        "messages": messages
    })


@app.get("/upload", response_class=HTMLResponse)
async def upload_page(request: Request):
    """Página de upload de contatos"""
    return templates.TemplateResponse("upload.html", {
        "request": request
    })


@app.get("/whatsapp", response_class=HTMLResponse)
async def whatsapp_connection_page(request: Request):
    """Página de gerenciamento da conexão WhatsApp"""
    instances = await wpp_manager.get_all_instances_status()
    return templates.TemplateResponse("whatsapp_connection.html", {
        "request": request,
        "instances": instances
    })


# ==========================================
# ROTAS API - WHATSAPP CONNECTION
# ==========================================

@app.get("/api/whatsapp/status")
async def whatsapp_status():
    """Status de todas as instâncias WhatsApp"""
    return await wpp_manager.get_all_instances_status()


@app.get("/api/whatsapp/qrcode")
async def whatsapp_qrcode(host: Optional[str] = None):
    """Obtém QR Code para conexão"""
    return await wpp_manager.get_qrcode(host)


@app.get("/api/whatsapp/profile")
async def whatsapp_profile(host: Optional[str] = None):
    """Obtém informações do perfil conectado"""
    return await wpp_manager.get_profile(host)


@app.post("/api/whatsapp/restart")
async def whatsapp_restart(host: Optional[str] = None):
    """Reinicia sessão WhatsApp"""
    result = await wpp_manager.restart(host)
    return {"success": True, "data": result}


@app.post("/api/whatsapp/disconnect")
async def whatsapp_disconnect(host: Optional[str] = None):
    """Desconecta WhatsApp"""
    result = await wpp_manager.disconnect(host)
    return {"success": True, "data": result}


# ==========================================
# ROTAS API - WHATSAPP CONTACTS IMPORT
# ==========================================

@app.get("/api/whatsapp/contacts")
async def get_whatsapp_contacts(host: Optional[str] = None):
    """Obtém contatos do WhatsApp (salvos + chats)"""
    result = await wpp_manager.get_all_contacts(host)
    return result


@app.post("/api/whatsapp/import-contacts")
async def import_whatsapp_contacts(
    host: Optional[str] = None,
    filter_type: str = "all",  # all, saved, chats
    campaign_id: Optional[int] = None
):
    """
    Importa contatos do WhatsApp para uma campanha
    
    Args:
        host: Host da instância WPPConnect
        filter_type: Tipo de filtro (all, saved, chats)
        campaign_id: ID da campanha (opcional, se não fornecido retorna contatos sem salvar)
    """
    try:
        # Buscar contatos do WhatsApp
        if filter_type == "saved":
            result = await wpp_manager.get_contacts(host)
        elif filter_type == "chats":
            result = await wpp_manager.get_chats(host)
        else:  # all
            result = await wpp_manager.get_all_contacts(host)
        
        if not result.get("success", True):
            return {"success": False, "error": result.get("error", "Erro ao buscar contatos")}
        
        contacts = result.get("contacts", [])
        
        if not contacts:
            return {"success": True, "imported": 0, "message": "Nenhum contato encontrado"}
        
        # Se não tiver campaign_id, apenas retorna os contatos
        if not campaign_id:
            return {
                "success": True,
                "contacts": contacts,
                "count": len(contacts),
                "message": f"{len(contacts)} contatos encontrados"
            }
        
        # Verificar se campanha existe
        campaign = await db.get_campaign(campaign_id)
        if not campaign:
            return {"success": False, "error": "Campanha não encontrada"}
        
        # Preparar mensagens
        messages_data = []
        for contact in contacts:
            phone = contact.get("phone", "")
            if not phone:
                continue
            
            # Formatar telefone
            phone = _format_phone(phone)
            if not phone:
                continue
            
            # Usar o melhor nome disponível
            name = (contact.get("name") or 
                   contact.get("pushname") or 
                   contact.get("verifiedName") or 
                   "")
            
            # Processar mensagem com template
            message = TemplateProcessor.process(
                campaign.message_template,
                {"nome": name}
            )
            
            messages_data.append({
                "phone": phone,
                "message": message
            })
        
        # Salvar no banco
        await db.add_contacts(campaign_id, messages_data)
        
        return {
            "success": True,
            "imported": len(messages_data),
            "total": len(contacts),
            "message": f"{len(messages_data)} contatos importados com sucesso!"
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}


def _format_phone(phone: str) -> str:
    """Formata número de telefone para padrão brasileiro"""
    import re
    
    # Remover tudo que não é dígito
    digits = re.sub(r"\D", "", phone)
    
    # Remover prefixo do país se existir (55)
    if digits.startswith("55") and len(digits) > 10:
        digits = digits[2:]
    
    # Validar tamanho
    if len(digits) < 10 or len(digits) > 11:
        return ""
    
    # Adicionar 9 se necessário (para números de celular)
    if len(digits) == 10:
        if digits[2] != "9":
            digits = digits[:2] + "9" + digits[2:]
    
    # Adicionar prefixo do Brasil
    return f"55{digits}"


# ==========================================
# ROTAS API - CAMPAIGNS
# ==========================================

@app.get("/health")
async def health_check():
    """Health check da aplicação"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/api/status", response_model=SystemStatus)
async def system_status():
    """Status completo do sistema"""
    campaigns = await db.get_campaigns()
    running = sum(1 for c in campaigns if c.status == CampaignStatus.RUNNING)
    
    # Verificar WPPConnect
    wpp_status = await sender.wpp.check_health()
    
    # Contar mensagens enviadas hoje
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    return SystemStatus(
        campaigns_running=running,
        campaigns_total=len(campaigns),
        messages_sent_today=0,  # Simplificado
        wpp_status=WPPStatus(**wpp_status),
        queue_size=0
    )


@app.get("/api/campaigns", response_model=List[Campaign])
async def list_campaigns(status: Optional[CampaignStatus] = None):
    """Lista campanhas"""
    return await db.get_campaigns(status)


@app.post("/api/campaigns", response_model=Campaign)
async def create_campaign(campaign_data: CampaignCreate):
    """Cria nova campanha"""
    campaign_id = await db.create_campaign(
        name=campaign_data.name,
        message_template=campaign_data.message_template,
        delay_min=campaign_data.delay_min,
        delay_max=campaign_data.delay_max,
        max_per_hour=campaign_data.max_per_hour
    )
    
    campaign = await db.get_campaign(campaign_id)
    return campaign


@app.get("/api/campaigns/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: int):
    """Busca campanha por ID"""
    campaign = await db.get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    return campaign


@app.post("/api/campaigns/{campaign_id}/upload")
async def upload_contacts(
    campaign_id: int,
    file: UploadFile = File(...)
):
    """Upload de arquivo CSV com contatos"""
    # Verificar extensão
    ext = file.filename.split('.')[-1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Extensão não permitida. Use: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    # Ler arquivo
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="Arquivo muito grande")
    
    # Processar CSV
    contacts, errors = ContactReader.read_file(content, file.filename)
    
    if not contacts:
        return JSONResponse({
            "success": False,
            "contacts_count": 0,
            "errors": errors if errors else ["Nenhum contato encontrado no arquivo"]
        }, status_code=400)
    
    # Validar contatos
    valid_contacts, validation_errors = ContactReader.validate_contacts(contacts)
    errors.extend(validation_errors)
    
    # Buscar campanha para template
    campaign = await db.get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    
    # Preparar mensagens
    messages_data = []
    for contact in valid_contacts:
        message = TemplateProcessor.process(
            campaign.message_template,
            contact.variables
        )
        messages_data.append({
            "phone": contact.phone,
            "message": message
        })
    
    # Salvar no banco
    await db.add_contacts(campaign_id, messages_data)
    
    return {
        "success": True,
        "filename": file.filename,
        "contacts_count": len(valid_contacts),
        "errors": errors[:10]  # Limitar erros retornados
    }


@app.post("/api/campaigns/{campaign_id}/start")
async def start_campaign(campaign_id: int):
    """Inicia campanha"""
    try:
        await sender.start_campaign(campaign_id)
        return {"success": True, "message": "Campanha iniciada"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/campaigns/{campaign_id}/pause")
async def pause_campaign(campaign_id: int):
    """Pausa campanha"""
    await sender.pause_campaign()
    return {"success": True, "message": "Campanha pausada"}


@app.post("/api/campaigns/{campaign_id}/cancel")
async def cancel_campaign(campaign_id: int):
    """Cancela campanha"""
    await sender.cancel_campaign(campaign_id)
    return {"success": True, "message": "Campanha cancelada"}


@app.delete("/api/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: int):
    """Remove campanha"""
    await db.delete_campaign(campaign_id)
    return {"success": True, "message": "Campanha removida"}


@app.get("/api/campaigns/{campaign_id}/stats", response_model=CampaignStats)
async def campaign_stats(campaign_id: int):
    """Estatísticas da campanha"""
    campaign = await db.get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    
    stats = await db.get_messages_stats(campaign_id)
    
    # Calcular progresso
    progress = 0
    if stats['total'] > 0:
        progress = ((stats['sent'] + stats['failed']) / stats['total']) * 100
    
    return CampaignStats(
        campaign_id=campaign_id,
        name=campaign.name,
        status=campaign.status,
        total=stats['total'],
        sent=stats['sent'],
        failed=stats['failed'],
        pending=stats['pending'],
        progress_percent=round(progress, 2),
        estimated_completion=None,
        average_delay=(campaign.delay_min + campaign.delay_max) / 2
    )


@app.get("/api/campaigns/{campaign_id}/messages")
async def list_messages(
    campaign_id: int,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Lista mensagens da campanha"""
    status_enum = None
    if status:
        try:
            status_enum = MessageStatus(status)
        except ValueError:
            pass
    
    messages = await db.get_messages(campaign_id, status_enum, limit, offset)
    return messages


@app.get("/api/sender/status")
async def sender_status():
    """Status do sender"""
    return await sender.get_status()


# ==========================================
# WEBSOCKET PARA ATUALIZAÇÕES EM TEMPO REAL
# ==========================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Receber ping do cliente
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
            
            # Enviar status atual
            status = await sender.get_status()
            await websocket.send_json({
                "type": "status",
                "data": status
            })
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)