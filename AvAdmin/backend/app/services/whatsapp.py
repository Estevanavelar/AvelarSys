# ========================================
# AVADMIN - WhatsApp Service (COMPLETO)
# ========================================
# Integração WhatsApp com múltiplos providers:
# 1. WhatsApp Business API (oficial)
# 2. WPPConnect (via Node.js - alternativa)
# 3. Modo Desenvolvimento (logs apenas)

import asyncio
import aiohttp
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Literal
from enum import Enum
import logging
import os
import random
import string

from ..core.config import settings

# Setup logging
logger = logging.getLogger("whatsapp_service")

# ==========================================
# ENUMS E TIPOS
# ==========================================

class WhatsAppProvider(str, Enum):
    """Providers disponíveis para envio WhatsApp"""
    BUSINESS_API = "business_api"      # WhatsApp Business API oficial
    WPPCONNECT = "wppconnect"          # WPPConnect (Node.js)
    DEVELOPMENT = "development"         # Apenas logs (dev)

class MessageType(str, Enum):
    """Tipos de mensagem"""
    VERIFICATION_CODE = "verification_code"
    WELCOME = "welcome"
    PASSWORD_RESET = "password_reset"
    PRODUCT_INTEREST = "product_interest"
    TRANSACTION_CONFIRM = "transaction_confirm"
    CUSTOM = "custom"

class MessageStatus(str, Enum):
    """Status de envio"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"

# ==========================================
# TEMPLATES DE MENSAGEM
# ==========================================

MESSAGE_TEMPLATES = {
    MessageType.VERIFICATION_CODE: """🔐 *Avelar System - Código de Verificação*

Seu código de verificação é: *{code}*

⏰ Válido por {expiry_minutes} minutos
📅 Enviado em: {timestamp}

⚠️ *Não compartilhe este código com ninguém.*
Se você não solicitou este código, ignore esta mensagem.

---
_Avelar Company - Transformando o B2B brasileiro_""",

    MessageType.WELCOME: """🎉 *Bem-vindo ao Avelar System!*

Olá, *{name}*!

Sua conta foi criada com sucesso ✅

📱 *Acesse agora:*
🔗 https://app.avelarcompany.com.br

📧 *Dados da sua conta:*
• Nome: {name}
• Documento: {document}
• WhatsApp: {whatsapp}

Estamos felizes em tê-lo conosco! 🚀

---
_Avelar Company - Suporte: suporte@avelarcompany.com.br_""",

    MessageType.PASSWORD_RESET: """🔑 *Avelar System - Redefinição de Senha*

Olá, *{name}*!

Você solicitou a redefinição de sua senha.

Seu código de recuperação é: *{code}*

⏰ Válido por {expiry_minutes} minutos

⚠️ Se você não solicitou esta alteração, entre em contato imediatamente com nosso suporte.

---
_Avelar Company - Segurança é nossa prioridade_""",

    MessageType.PRODUCT_INTEREST: """📦 *StockTech - Interesse em Produto*

🙋‍♂️ *Cliente interessado:*
• Nome: {buyer_name}
• WhatsApp: {buyer_whatsapp}

📱 *Produto:*
• Nome: {product_name}
• Código: {product_code}
• Preço: R$ {product_price}

💬 *Mensagem do cliente:*
_{buyer_message}_

Entre em contato para finalizar a negociação! 🤝

---
_StockTech - Marketplace B2B de Eletrônicos_""",

    MessageType.TRANSACTION_CONFIRM: """✅ *Transação Confirmada - StockTech*

Olá, *{name}*!

Sua transação foi {status}:

📦 *Detalhes:*
• Produto: {product_name}
• Quantidade: {quantity}
• Valor Total: R$ {total_value}
• ID da Transação: {transaction_id}

{additional_info}

---
_StockTech - Marketplace B2B de Eletrônicos_""",
}

# ==========================================
# PROVIDER: WHATSAPP BUSINESS API
# ==========================================

class WhatsAppBusinessAPI:
    """Provider oficial WhatsApp Business API (Meta)"""
    
    def __init__(self):
        self.api_token = settings.whatsapp_api_token
        self.phone_number_id = settings.whatsapp_phone_number_id
        self.api_version = "v18.0"
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
        
    @property
    def is_configured(self) -> bool:
        """Verifica se está configurado"""
        return bool(self.api_token and self.phone_number_id)
    
    async def send_text_message(self, to: str, message: str) -> Dict[str, Any]:
        """Envia mensagem de texto"""
        if not self.is_configured:
            raise ValueError("WhatsApp Business API não configurado")
        
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        
        # Formatar número (remover + e espaços)
        phone = to.replace("+", "").replace(" ", "").replace("-", "")
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone,
            "type": "text",
            "text": {
                "preview_url": True,
                "body": message
            }
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                result = await response.json()
                
                if response.status == 200:
                    logger.info(f"✅ WhatsApp Business API: Mensagem enviada para {phone}")
                    return {
                        "success": True,
                        "message_id": result.get("messages", [{}])[0].get("id"),
                        "provider": "business_api",
                        "response": result
                    }
                else:
                    logger.error(f"❌ WhatsApp Business API Error: {result}")
                    return {
                        "success": False,
                        "error": result.get("error", {}).get("message", "Unknown error"),
                        "provider": "business_api",
                        "response": result
                    }
    
    async def send_template_message(self, to: str, template_name: str, 
                                    language: str = "pt_BR",
                                    components: List[Dict] = None) -> Dict[str, Any]:
        """Envia mensagem usando template aprovado"""
        if not self.is_configured:
            raise ValueError("WhatsApp Business API não configurado")
        
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        
        phone = to.replace("+", "").replace(" ", "").replace("-", "")
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language}
            }
        }
        
        if components:
            payload["template"]["components"] = components
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                result = await response.json()
                
                return {
                    "success": response.status == 200,
                    "message_id": result.get("messages", [{}])[0].get("id") if response.status == 200 else None,
                    "provider": "business_api",
                    "response": result
                }

# ==========================================
# PROVIDER: WPPCONNECT (NODE.JS)
# ==========================================

class WPPConnectProvider:
    """Provider WPPConnect - servidor Node.js local (Avelar WPPConnect Server)"""
    
    def __init__(self):
        self.base_url = settings.wppconnect_url or "http://localhost:21465"
        
    @property
    def is_configured(self) -> bool:
        """Verifica se está configurado"""
        return bool(self.base_url)
    
    async def get_qr_code(self) -> Optional[str]:
        """Obtém QR Code para conexão"""
        url = f"{self.base_url}/api/qrcode"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result.get("qrcode")
        except Exception as e:
            logger.error(f"WPPConnect: Erro ao obter QR Code: {e}")
        
        return None

    async def start_session(self) -> bool:
        """Inicia sessão (no WPPConnect gera QR via /api/qrcode)"""
        qr = await self.get_qr_code()
        return bool(qr)
    
    async def check_connection(self) -> bool:
        """Verifica se está conectado"""
        url = f"{self.base_url}/api/status"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result.get("status") == "connected"
        except Exception as e:
            logger.error(f"WPPConnect: Erro ao verificar conexão: {e}")
        
        return False
    
    async def send_text_message(self, to: str, message: str) -> Dict[str, Any]:
        """Envia mensagem de texto via WPPConnect (Avelar Server)"""
        # Formatar número (remover caracteres especiais)
        phone = to.replace("+", "").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        
        url = f"{self.base_url}/api/send-message"
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "phone": phone,
            "message": message,
            "isGroup": False
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    result = await response.json()
                    
                    if response.status == 200 or response.status == 201:
                        logger.info(f"✅ WPPConnect: Mensagem enviada para {to}")
                        return {
                            "success": True,
                            "message_id": result.get("id"),
                            "provider": "wppconnect",
                            "response": result
                        }
                    else:
                        logger.error(f"❌ WPPConnect Error: {result}")
                        return {
                            "success": False,
                            "error": result.get("error", result.get("message", "Unknown error")),
                            "provider": "wppconnect",
                            "response": result
                        }
        except Exception as e:
            logger.error(f"WPPConnect: Erro ao enviar mensagem: {e}")
            return {
                "success": False,
                "error": str(e),
                "provider": "wppconnect"
            }

# ==========================================
# PROVIDER: DESENVOLVIMENTO (LOGS)
# ==========================================

class DevelopmentProvider:
    """Provider de desenvolvimento - apenas logs"""
    
    def __init__(self):
        self.sent_messages: List[Dict] = []
        self.success_rate = 1.0  # 100% sucesso em dev
        
    @property
    def is_configured(self) -> bool:
        return True
    
    async def send_text_message(self, to: str, message: str) -> Dict[str, Any]:
        """Simula envio - apenas loga"""
        message_id = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
        
        log_entry = {
            "id": message_id,
            "to": to,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "status": "sent"
        }
        
        self.sent_messages.append(log_entry)
        
        # Log formatado para fácil leitura
        logger.info("=" * 60)
        logger.info("📱 [DEV] WHATSAPP MESSAGE SIMULATION")
        logger.info("=" * 60)
        logger.info(f"📞 Para: {to}")
        logger.info(f"🆔 ID: {message_id}")
        logger.info(f"📅 Data: {log_entry['timestamp']}")
        logger.info("-" * 60)
        logger.info("📝 MENSAGEM:")
        for line in message.split('\n'):
            logger.info(f"   {line}")
        logger.info("=" * 60)
        
        # Simula delay de rede
        await asyncio.sleep(0.5)
        
        return {
            "success": True,
            "message_id": message_id,
            "provider": "development",
            "simulated": True,
            "response": log_entry
        }
    
    def get_sent_messages(self) -> List[Dict]:
        """Retorna mensagens enviadas (para testes)"""
        return self.sent_messages
    
    def clear_messages(self):
        """Limpa histórico de mensagens"""
        self.sent_messages = []

# ==========================================
# SERVIÇO PRINCIPAL WHATSAPP
# ==========================================

class WhatsAppService:
    """Serviço principal de WhatsApp com múltiplos providers"""
    
    def __init__(self):
        # Inicializar providers
        self.business_api = WhatsAppBusinessAPI()
        self.wppconnect = WPPConnectProvider()
        self.development = DevelopmentProvider()
        
        # Determinar provider ativo baseado no ambiente
        self._active_provider = self._determine_provider()
        logger.info(f"📱 WhatsApp Service iniciado com provider: {self._active_provider}")
    
    def _determine_provider(self) -> WhatsAppProvider:
        """Determina qual provider usar baseado na configuração"""
        # Verificar se WPPConnect está explicitamente configurado
        if settings.use_wppconnect:
            return WhatsAppProvider.WPPCONNECT
        
        # Em produção, priorizar Business API
        if settings.environment == "production":
            if self.business_api.is_configured:
                return WhatsAppProvider.BUSINESS_API
            # Fallback para WPPConnect se configurado
            if self.wppconnect.is_configured:
                return WhatsAppProvider.WPPCONNECT
        
        # Verificar se Business API está configurado
        if self.business_api.is_configured:
            return WhatsAppProvider.BUSINESS_API
        
        # Default: modo desenvolvimento
        return WhatsAppProvider.DEVELOPMENT
    
    @property
    def active_provider(self) -> WhatsAppProvider:
        return self._active_provider
    
    def set_provider(self, provider: WhatsAppProvider):
        """Altera o provider ativo manualmente"""
        self._active_provider = provider
        logger.info(f"📱 WhatsApp provider alterado para: {provider}")
    
    def _get_provider_instance(self):
        """Retorna instância do provider ativo"""
        if self._active_provider == WhatsAppProvider.BUSINESS_API:
            return self.business_api
        elif self._active_provider == WhatsAppProvider.WPPCONNECT:
            return self.wppconnect
        else:
            return self.development
    
    async def send_message(self, to: str, message: str, 
                          message_type: MessageType = MessageType.CUSTOM,
                          retry_count: int = 0) -> Dict[str, Any]:
        """Envia mensagem usando o provider ativo"""
        provider = self._get_provider_instance()
        
        try:
            result = await provider.send_text_message(to, message)
            
            # Se falhou e tem retry disponível, tenta fallback
            if not result.get("success") and retry_count < settings.whatsapp_max_retries:
                logger.warning(f"⚠️ Tentativa {retry_count + 1} falhou, tentando fallback...")
                
                # Tentar próximo provider
                if self._active_provider == WhatsAppProvider.BUSINESS_API:
                    fallback = self.wppconnect
                elif self._active_provider == WhatsAppProvider.WPPCONNECT:
                    fallback = self.development
                else:
                    return result
                
                result = await fallback.send_text_message(to, message)
                result["fallback_used"] = True
            
            # Adicionar metadata
            result["message_type"] = message_type.value
            result["timestamp"] = datetime.now().isoformat()
            result["recipient"] = to
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Erro ao enviar WhatsApp: {e}")
            return {
                "success": False,
                "error": str(e),
                "provider": self._active_provider.value,
                "message_type": message_type.value,
                "timestamp": datetime.now().isoformat()
            }
    
    async def send_template(self, to: str, template_type: MessageType, 
                           variables: Dict[str, Any]) -> Dict[str, Any]:
        """Envia mensagem usando template pré-definido"""
        template = MESSAGE_TEMPLATES.get(template_type)
        
        if not template:
            return {
                "success": False,
                "error": f"Template não encontrado: {template_type}"
            }
        
        # Adicionar timestamp se não fornecido
        if "timestamp" not in variables:
            variables["timestamp"] = datetime.now().strftime("%d/%m/%Y %H:%M")
        
        # Formatar mensagem
        try:
            message = template.format(**variables)
        except KeyError as e:
            return {
                "success": False,
                "error": f"Variável faltando no template: {e}"
            }
        
        return await self.send_message(to, message, template_type)
    
    async def health_check(self) -> Dict[str, Any]:
        """Verifica saúde do serviço"""
        status = {
            "active_provider": self._active_provider.value,
            "providers": {}
        }
        
        # Business API
        status["providers"]["business_api"] = {
            "configured": self.business_api.is_configured,
            "status": "available" if self.business_api.is_configured else "not_configured"
        }
        
        # WPPConnect
        wpp_connected = False
        if self.wppconnect.is_configured:
            wpp_connected = await self.wppconnect.check_connection()
        
        status["providers"]["wppconnect"] = {
            "configured": self.wppconnect.is_configured,
            "connected": wpp_connected,
            "status": "connected" if wpp_connected else ("available" if self.wppconnect.is_configured else "not_configured")
        }
        
        # Development
        status["providers"]["development"] = {
            "configured": True,
            "status": "always_available",
            "messages_sent": len(self.development.sent_messages)
        }
        
        return status

# ==========================================
# INSTÂNCIA GLOBAL
# ==========================================

whatsapp_service = WhatsAppService()

# ==========================================
# FUNÇÕES DE CONVENIÊNCIA
# ==========================================

async def send_verification_code(whatsapp: str, code: str, 
                                 expiry_minutes: int = 5) -> Dict[str, Any]:
    """Envia código de verificação via WhatsApp"""
    return await whatsapp_service.send_template(
        to=whatsapp,
        template_type=MessageType.VERIFICATION_CODE,
        variables={
            "code": code,
            "expiry_minutes": expiry_minutes
        }
    )

async def send_welcome_message(whatsapp: str, name: str, 
                               document: str = "***") -> Dict[str, Any]:
    """Envia mensagem de boas vindas"""
    return await whatsapp_service.send_template(
        to=whatsapp,
        template_type=MessageType.WELCOME,
        variables={
            "name": name,
            "document": document,
            "whatsapp": whatsapp
        }
    )

async def send_password_reset_code(whatsapp: str, name: str, 
                                   code: str, expiry_minutes: int = 10) -> Dict[str, Any]:
    """Envia código de reset de senha"""
    return await whatsapp_service.send_template(
        to=whatsapp,
        template_type=MessageType.PASSWORD_RESET,
        variables={
            "name": name,
            "code": code,
            "expiry_minutes": expiry_minutes
        }
    )

async def send_product_interest(seller_whatsapp: str, buyer_name: str, 
                                buyer_whatsapp: str, product_data: Dict[str, Any],
                                buyer_message: str = "") -> Dict[str, Any]:
    """Envia notificação de interesse em produto"""
    return await whatsapp_service.send_template(
        to=seller_whatsapp,
        template_type=MessageType.PRODUCT_INTEREST,
        variables={
            "buyer_name": buyer_name,
            "buyer_whatsapp": buyer_whatsapp,
            "product_name": product_data.get("name", "Produto"),
            "product_code": product_data.get("code", "N/A"),
            "product_price": f"{product_data.get('price', 0):.2f}",
            "buyer_message": buyer_message or "Tenho interesse neste produto!"
        }
    )

async def send_transaction_notification(whatsapp: str, name: str,
                                        transaction_data: Dict[str, Any]) -> Dict[str, Any]:
    """Envia notificação de transação"""
    return await whatsapp_service.send_template(
        to=whatsapp,
        template_type=MessageType.TRANSACTION_CONFIRM,
        variables={
            "name": name,
            "status": transaction_data.get("status", "processada"),
            "product_name": transaction_data.get("product_name", "Produto"),
            "quantity": transaction_data.get("quantity", 1),
            "total_value": f"{transaction_data.get('total_value', 0):.2f}",
            "transaction_id": transaction_data.get("id", "N/A"),
            "additional_info": transaction_data.get("additional_info", "")
        }
    )

async def send_custom_message(whatsapp: str, message: str) -> Dict[str, Any]:
    """Envia mensagem customizada"""
    return await whatsapp_service.send_message(
        to=whatsapp,
        message=message,
        message_type=MessageType.CUSTOM
    )

async def health_check() -> Dict[str, Any]:
    """Verificação de saúde do serviço WhatsApp"""
    return await whatsapp_service.health_check()

# ==========================================
# UTILITÁRIOS
# ==========================================

def generate_verification_code(length: int = 6) -> str:
    """Gera código de verificação numérico"""
    return ''.join(random.choices(string.digits, k=length))

def format_phone_number(phone: str, country_code: str = "55") -> str:
    """Formata número de telefone para padrão internacional"""
    # Remover caracteres não numéricos
    digits = ''.join(filter(str.isdigit, phone))
    
    # Adicionar código do país se necessário
    if not digits.startswith(country_code):
        digits = country_code + digits
    
    return f"+{digits}"
