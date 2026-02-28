# ========================================
# AVADMIN - WhatsApp Routes
# ========================================
# Rotas para gerenciamento e webhook do WhatsApp

from fastapi import APIRouter, HTTPException, Request, Query, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
import hmac
import hashlib
import aiohttp

from ..services.whatsapp import (
    whatsapp_service,
    send_verification_code,
    send_custom_message,
    health_check as whatsapp_health_check,
    generate_verification_code,
    format_phone_number,
    WhatsAppProvider,
    MessageType
)
from ..core.config import settings

logger = logging.getLogger("whatsapp_routes")

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

# ==========================================
# SCHEMAS
# ==========================================

class SendMessageRequest(BaseModel):
    """Request para envio de mensagem"""
    phone: str = Field(..., description="Número do telefone com DDD")
    message: str = Field(..., description="Mensagem a enviar")
    
class SendTemplateRequest(BaseModel):
    """Request para envio de template"""
    phone: str = Field(..., description="Número do telefone com DDD")
    template_type: str = Field(..., description="Tipo do template")
    variables: Dict[str, Any] = Field(default={}, description="Variáveis do template")

class WebhookVerification(BaseModel):
    """Verificação de webhook Meta"""
    hub_mode: str = Field(alias="hub.mode")
    hub_verify_token: str = Field(alias="hub.verify_token")
    hub_challenge: str = Field(alias="hub.challenge")

class ChangeProviderRequest(BaseModel):
    """Request para trocar provider"""
    provider: str = Field(..., description="Provider: business_api, wppconnect, development")

class WPPConnectSessionRequest(BaseModel):
    """Request para operações de sessão WPPConnect"""
    action: str = Field(..., description="Ação: start, stop, status, qrcode")

# ==========================================
# WPPCONNECT PROXY URL
# ==========================================

WPPCONNECT_URL = settings.wppconnect_url if hasattr(settings, 'wppconnect_url') else "http://localhost:21465"

# ==========================================
# ROTAS DE STATUS
# ==========================================

@router.get("/health")
async def whatsapp_health():
    """Verifica saúde do serviço WhatsApp"""
    return await whatsapp_health_check()

@router.get("/status")
async def whatsapp_status():
    """Status detalhado do serviço WhatsApp"""
    health = await whatsapp_health_check()
    
    # Also fetch WPPConnect status
    wpp_status = None
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{WPPCONNECT_URL}/api/status", timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    wpp_status = await resp.json()
    except Exception as e:
        logger.debug(f"Could not fetch WPPConnect status: {e}")
    
    return {
        "service": "whatsapp",
        "status": "operational",
        "active_provider": health["active_provider"],
        "providers": health["providers"],
        "wppconnect": wpp_status,
        "environment": settings.environment,
        "timestamp": datetime.now().isoformat()
    }

# ==========================================
# WPPCONNECT PROXY ROUTES
# ==========================================

@router.get("/wppconnect/proxy/status")
async def wppconnect_proxy_status():
    """Proxy para status do WPPConnect (evita problemas de CORS/mixed content)"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{WPPCONNECT_URL}/api/status", timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    return await resp.json()
                return {"status": "error", "code": resp.status}
    except Exception as e:
        logger.error(f"Error fetching WPPConnect status: {e}")
        return {"status": "error", "message": str(e)}

@router.get("/wppconnect/proxy/qrcode")
async def wppconnect_proxy_qrcode():
    """Proxy para QR Code do WPPConnect"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{WPPCONNECT_URL}/api/qrcode", timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get("qrcode") or data.get("qrCode") or data.get("status") == "connected":
                        return data
                    return {
                        "status": "error",
                        "message": data.get("message") or "QR Code não disponível. Aguarde ou reinicie o servidor."
                    }
                return {"status": "error", "message": f"WPPConnect respondeu com status HTTP {resp.status}"}
    except Exception as e:
        logger.error(f"Error fetching WPPConnect QR Code: {e}")
        return {"status": "error", "message": str(e)}

@router.post("/wppconnect/proxy/send")
async def wppconnect_proxy_send(request: SendMessageRequest):
    """Proxy para envio de mensagem via WPPConnect"""
    try:
        # Remover caracteres não numéricos
        phone = ''.join(filter(str.isdigit, request.phone))
        
        # Adicionar código do Brasil (55) se não tiver
        if not phone.startswith("55"):
            phone = f"55{phone}"
        
        logger.info(f"Sending message to {phone} via WPPConnect")
            
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{WPPCONNECT_URL}/api/send-message",
                json={"phone": phone, "message": request.message},
                timeout=aiohttp.ClientTimeout(total=30)
            ) as resp:
                try:
                    result = await resp.json()
                except Exception:
                    raw_text = await resp.text()
                    result = {
                        "success": resp.status == 200,
                        "status": resp.status,
                        "raw": raw_text,
                        "error": "invalid_json_response"
                    }
                logger.info(f"WPPConnect response (status={resp.status}): {result}")
                return result
    except Exception as e:
        logger.error(f"Error sending via WPPConnect: {e}")
        return {"success": False, "error": str(e)}

@router.post("/wppconnect/proxy/restart")
async def wppconnect_proxy_restart():
    """Proxy para reiniciar WPPConnect"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{WPPCONNECT_URL}/api/restart", timeout=aiohttp.ClientTimeout(total=10)) as resp:
                return await resp.json()
    except Exception as e:
        logger.error(f"Error restarting WPPConnect: {e}")
        return {"success": False, "error": str(e)}

# ==========================================
# ROTAS DE CONFIGURAÇÃO
# ==========================================

@router.post("/provider/change")
async def change_provider(request: ChangeProviderRequest):
    """Altera o provider ativo de WhatsApp"""
    try:
        provider = WhatsAppProvider(request.provider)
        whatsapp_service.set_provider(provider)
        
        return {
            "success": True,
            "message": f"Provider alterado para: {provider.value}",
            "active_provider": whatsapp_service.active_provider.value
        }
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail=f"Provider inválido. Use: business_api, wppconnect, development"
        )

@router.get("/provider/current")
async def get_current_provider():
    """Retorna o provider ativo atual"""
    return {
        "active_provider": whatsapp_service.active_provider.value,
        "available_providers": [p.value for p in WhatsAppProvider]
    }

# ==========================================
# ROTAS DE ENVIO
# ==========================================

@router.post("/send")
async def send_message(request: SendMessageRequest):
    """Envia mensagem WhatsApp customizada"""
    
    # Formatar número
    phone = format_phone_number(request.phone)
    
    result = await send_custom_message(phone, request.message)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Erro ao enviar mensagem")
        )
    
    return result

@router.post("/send/template")
async def send_template_message(request: SendTemplateRequest):
    """Envia mensagem usando template"""
    
    try:
        template_type = MessageType(request.template_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Template inválido. Disponíveis: {[t.value for t in MessageType]}"
        )
    
    phone = format_phone_number(request.phone)
    
    result = await whatsapp_service.send_template(
        to=phone,
        template_type=template_type,
        variables=request.variables
    )
    
    if not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Erro ao enviar template")
        )
    
    return result

@router.post("/send/verification-code")
async def send_verification(phone: str = Query(...), user_name: str = Query(default="Usuário")):
    """Envia código de verificação"""
    
    code = generate_verification_code()
    formatted_phone = format_phone_number(phone)
    
    result = await send_verification_code(formatted_phone, code)
    
    if result.get("success"):
        return {
            "success": True,
            "message": "Código enviado com sucesso",
            "code": code if settings.environment != "production" else "****",  # Só mostra em dev
            "phone": formatted_phone,
            "expires_in_minutes": 5
        }
    else:
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Erro ao enviar código")
        )

# ==========================================
# ROTAS WPPCONNECT
# ==========================================

@router.post("/wppconnect/session")
async def wppconnect_session(request: WPPConnectSessionRequest):
    """Gerencia sessão WPPConnect"""
    
    if whatsapp_service.active_provider != WhatsAppProvider.WPPCONNECT:
        raise HTTPException(
            status_code=400,
            detail="WPPConnect não é o provider ativo"
        )
    
    wpp = whatsapp_service.wppconnect
    
    if request.action == "start":
        result = await wpp.start_session()
        return {"success": result, "action": "start_session"}
    
    elif request.action == "status":
        connected = await wpp.check_connection()
        return {"connected": connected, "action": "status"}
    
    elif request.action == "qrcode":
        qr = await wpp.get_qr_code()
        if qr:
            return {"qrcode": qr, "action": "qrcode"}
        else:
            raise HTTPException(status_code=404, detail="QR Code não disponível")
    
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Ação inválida. Use: start, status, qrcode"
        )

@router.get("/wppconnect/qrcode")
async def get_wppconnect_qrcode():
    """Obtém QR Code do WPPConnect para conexão"""
    
    wpp = whatsapp_service.wppconnect
    
    if not wpp.is_configured:
        raise HTTPException(
            status_code=400,
            detail="WPPConnect não está configurado"
        )
    
    # Verificar se já está conectado
    connected = await wpp.check_connection()
    if connected:
        return {
            "status": "connected",
            "message": "WhatsApp já está conectado"
        }
    
    # Iniciar sessão se necessário
    await wpp.start_session()
    
    # Obter QR Code
    qr = await wpp.get_qr_code()
    
    if qr:
        return {
            "status": "waiting_scan",
            "qrcode": qr,
            "message": "Escaneie o QR Code com seu WhatsApp"
        }
    else:
        return {
            "status": "generating",
            "message": "QR Code sendo gerado, tente novamente em alguns segundos"
        }

# ==========================================
# WEBHOOK META (WHATSAPP BUSINESS API)
# ==========================================

@router.get("/webhook")
async def verify_webhook(
    request: Request,
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge")
):
    """
    Verificação de webhook do Meta (WhatsApp Business API)
    Necessário para configurar webhook no painel Meta
    """
    
    # Token de verificação (configurar no Meta)
    VERIFY_TOKEN = settings.whatsapp_api_token or "avelar-webhook-token"
    
    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        logger.info("✅ Webhook verificado com sucesso")
        return int(hub_challenge)
    else:
        logger.warning(f"⚠️ Falha na verificação do webhook: mode={hub_mode}")
        raise HTTPException(status_code=403, detail="Verificação falhou")

@router.post("/webhook")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Recebe eventos do webhook WhatsApp Business API
    Processa mensagens recebidas, status de entrega, etc.
    """
    
    try:
        body = await request.json()
        
        # Log do evento recebido
        logger.info(f"📥 Webhook WhatsApp recebido: {body.get('object', 'unknown')}")
        
        # Processar eventos
        if body.get("object") == "whatsapp_business_account":
            for entry in body.get("entry", []):
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    
                    # Processar mensagens recebidas
                    if "messages" in value:
                        for message in value["messages"]:
                            background_tasks.add_task(
                                process_incoming_message,
                                message,
                                value.get("metadata", {})
                            )
                    
                    # Processar status de mensagens
                    if "statuses" in value:
                        for status in value["statuses"]:
                            background_tasks.add_task(
                                process_message_status,
                                status
                            )
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"❌ Erro ao processar webhook: {e}")
        return {"status": "error", "message": str(e)}

# ==========================================
# PROCESSAMENTO DE EVENTOS (BACKGROUND)
# ==========================================

async def process_incoming_message(message: Dict[str, Any], metadata: Dict[str, Any]):
    """Processa mensagem recebida (executa em background)"""
    
    msg_type = message.get("type")
    msg_from = message.get("from")
    msg_id = message.get("id")
    timestamp = message.get("timestamp")
    
    logger.info(f"📩 Mensagem recebida de {msg_from} (tipo: {msg_type})")
    
    # Processar texto
    if msg_type == "text":
        text = message.get("text", {}).get("body", "")
        logger.info(f"   Texto: {text[:100]}...")
        
        # Aqui você pode adicionar lógica para:
        # - Responder automaticamente
        # - Processar comandos
        # - Encaminhar para atendimento
        # - etc.
    
    # Processar mídia
    elif msg_type in ["image", "video", "audio", "document"]:
        media = message.get(msg_type, {})
        media_id = media.get("id")
        logger.info(f"   Mídia recebida: {media_id}")
    
    # Processar localização
    elif msg_type == "location":
        location = message.get("location", {})
        logger.info(f"   Localização: {location.get('latitude')}, {location.get('longitude')}")
    
    # Processar reação
    elif msg_type == "reaction":
        reaction = message.get("reaction", {})
        logger.info(f"   Reação: {reaction.get('emoji')} na mensagem {reaction.get('message_id')}")

async def process_message_status(status: Dict[str, Any]):
    """Processa status de mensagem (executa em background)"""
    
    msg_id = status.get("id")
    msg_status = status.get("status")
    recipient = status.get("recipient_id")
    timestamp = status.get("timestamp")
    
    logger.info(f"📊 Status atualizado: {msg_id} -> {msg_status} (para: {recipient})")
    
    # Aqui você pode:
    # - Atualizar banco de dados com status
    # - Notificar sistema de entregas/leituras
    # - etc.

# ==========================================
# ROTAS DE DESENVOLVIMENTO
# ==========================================

@router.get("/dev/messages")
async def get_dev_messages():
    """
    Lista mensagens enviadas no modo desenvolvimento
    Apenas disponível quando provider = development
    """
    
    if settings.environment == "production":
        raise HTTPException(status_code=403, detail="Não disponível em produção")
    
    return {
        "provider": "development",
        "messages": whatsapp_service.development.get_sent_messages(),
        "total": len(whatsapp_service.development.sent_messages)
    }

@router.delete("/dev/messages")
async def clear_dev_messages():
    """Limpa mensagens do modo desenvolvimento"""
    
    if settings.environment == "production":
        raise HTTPException(status_code=403, detail="Não disponível em produção")
    
    whatsapp_service.development.clear_messages()
    
    return {"success": True, "message": "Mensagens limpas"}

@router.get("/templates")
async def list_templates():
    """Lista templates de mensagem disponíveis"""
    
    from ..services.whatsapp import MESSAGE_TEMPLATES
    
    templates = []
    for msg_type, template in MESSAGE_TEMPLATES.items():
        # Extrair variáveis do template
        import re
        variables = re.findall(r'\{(\w+)\}', template)
        
        templates.append({
            "type": msg_type.value,
            "variables": list(set(variables)),
            "preview": template[:200] + "..." if len(template) > 200 else template
        })
    
    return {"templates": templates}

