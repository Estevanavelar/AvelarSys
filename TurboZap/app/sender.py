import asyncio
import random
import time
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import httpx
from app.config import settings
from app.models import MessageStatus, CampaignStatus
from app.database import db
from app.spintax import spintax
from app.warmup import warmup_manager


class WPPConnectClient:
    """Cliente para comunicação com WPPConnect"""
    
    def __init__(self):
        self.hosts = settings.wpp_hosts
        self.timeout = settings.WPP_TIMEOUT
        self.current_host_index = 0
        self.client = httpx.AsyncClient(timeout=self.timeout)
    
    def _get_host(self) -> str:
        """Retorna host atual com round-robin"""
        host = self.hosts[self.current_host_index]
        self.current_host_index = (self.current_host_index + 1) % len(self.hosts)
        return host
    
    async def check_health(self, host: Optional[str] = None) -> Dict:
        """Verifica saúde da instância WPPConnect"""
        host = host or self._get_host()
        try:
            response = await self.client.get(f"{host}/api/health")
            if response.status_code == 200:
                return response.json()
            return {"connected": False, "status": "error", "error": f"HTTP {response.status_code}"}
        except Exception as e:
            return {"connected": False, "status": "error", "error": str(e)}
    
    async def get_best_host(self) -> Optional[str]:
        """Retorna o primeiro host saudável disponível"""
        for host in self.hosts:
            health = await self.check_health(host)
            if health.get("connected", False):
                return host
        return None
    
    async def send_message(self, phone: str, message: str, 
                          retry_count: int = 0, typing: bool = True) -> Dict:
        """
        Envia mensagem via WPPConnect
        
        Args:
            phone: Número do telefone
            message: Mensagem a enviar
            retry_count: Contador de tentativas
            typing: Se deve simular digitação
            
        Returns:
            Dict com success, message_id, error
        """
        host = await self.get_best_host()
        
        if not host:
            return {
                "success": False,
                "error": "Nenhuma instância WPPConnect disponível"
            }
        
        try:
            response = await self.client.post(
                f"{host}/api/send-message",
                json={
                    "phone": phone,
                    "message": message,
                    "isGroup": False,
                    "typing": typing
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": data.get("success", False),
                    "message_id": data.get("id"),
                    "error": None
                }
            else:
                error_msg = f"HTTP {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg = error_data.get("error", error_msg)
                except:
                    pass
                
                return {
                    "success": False,
                    "error": error_msg
                }
                
        except httpx.TimeoutException:
            if retry_count < settings.MAX_RETRY_ATTEMPTS:
                await asyncio.sleep(settings.RETRY_DELAY_SECONDS)
                return await self.send_message(phone, message, retry_count + 1)
            return {"success": False, "error": "Timeout após múltiplas tentativas"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def close(self):
        """Fecha conexão HTTP"""
        await self.client.aclose()


class RateLimiter:
    """Controlador de taxa de envio"""
    
    def __init__(self):
        self.max_per_hour = settings.MAX_MSG_PER_HOUR
        self.max_per_second = settings.MAX_MSG_PER_SECOND
        self.sent_times: List[datetime] = []
        self._lock = asyncio.Lock()
    
    async def acquire(self) -> bool:
        """
        Tenta adquirir permissão para enviar mensagem
        Retorna True se permitido, False se deve esperar
        """
        async with self._lock:
            now = datetime.now()
            
            # Limpar entradas antigas (mais de 1 hora)
            cutoff = now - timedelta(hours=1)
            self.sent_times = [t for t in self.sent_times if t > cutoff]
            
            # Verificar limite por hora
            if len(self.sent_times) >= self.max_per_hour:
                return False
            
            # Verificar limite por segundo
            recent = [t for t in self.sent_times if (now - t).seconds < 1]
            if len(recent) >= self.max_per_second:
                return False
            
            # Registrar envio
            self.sent_times.append(now)
            return True
    
    async def wait_for_slot(self):
        """Aguarda até que um slot esteja disponível"""
        while not await self.acquire():
            await asyncio.sleep(0.5)
    
    def get_stats(self) -> Dict:
        """Retorna estatísticas de rate limiting"""
        now = datetime.now()
        cutoff = now - timedelta(hours=1)
        recent = [t for t in self.sent_times if t > cutoff]
        
        return {
            "sent_last_hour": len(recent),
            "max_per_hour": self.max_per_hour,
            "remaining": max(0, self.max_per_hour - len(recent)),
            "reset_time": (recent[0] + timedelta(hours=1)) if recent else now
        }


class SmartDelay:
    """Delay humanizado com pausas para simular comportamento humano"""
    
    def __init__(self):
        self.config = settings.smart_delay
        self.messages_sent = 0
        self.last_break_time = None
        self.short_break_counter = 0
        self.long_break_counter = 0
        self._short_break_threshold = random.randint(*self.config.short_break_every)
        self._long_break_threshold = random.randint(*self.config.long_break_every)
    
    def is_business_hours(self) -> bool:
        """Verifica se está dentro do horário comercial"""
        if not self.config.respect_business_hours:
            return True
        
        now = datetime.now()
        hour = now.hour
        return self.config.business_hours_start <= hour < self.config.business_hours_end
    
    def wait_for_business_hours(self) -> float:
        """Calcula quanto tempo esperar até o horário comercial"""
        now = datetime.now()
        
        if now.hour < self.config.business_hours_start:
            # Esperar até o início do horário comercial hoje
            target = now.replace(hour=self.config.business_hours_start, minute=0, second=0)
            wait_seconds = (target - now).total_seconds()
        else:
            # Esperar até o início do horário comercial amanhã
            tomorrow = now + timedelta(days=1)
            target = tomorrow.replace(hour=self.config.business_hours_start, minute=0, second=0)
            wait_seconds = (target - now).total_seconds()
        
        return wait_seconds
    
    async def delay_before_message(self, message_length: int = 0):
        """
        Aguarda delay antes de enviar mensagem
        
        Args:
            message_length: Comprimento da mensagem (para ajustar delay)
        """
        # Verificar horário comercial
        if not self.is_business_hours():
            wait_time = self.wait_for_business_hours()
            print(f"⏰ Fora do horário comercial. Aguardando {wait_time/3600:.1f} horas...")
            await asyncio.sleep(wait_time)
        
        # Calcular delay base
        delay = random.uniform(self.config.message_delay_min, self.config.message_delay_max)
        
        # Adicionar delay baseado no tamanho da mensagem
        if message_length > 0:
            extra_delay = message_length * self.config.message_length_factor
            delay += extra_delay
        
        # Aguardar
        await asyncio.sleep(delay)
    
    async def check_and_do_break(self) -> bool:
        """
        Verifica se é hora de fazer uma pausa
        
        Returns:
            True se fez uma pausa longa (café), False caso contrário
        """
        self.messages_sent += 1
        self.short_break_counter += 1
        self.long_break_counter += 1
        
        # Verificar pausa longa (café)
        if self.long_break_counter >= self._long_break_threshold:
            break_duration = random.randint(*self.config.long_break_duration)
            print(f"☕ Pausa para café! Aguardando {break_duration/60:.0f} minutos...")
            await asyncio.sleep(break_duration)
            
            # Resetar contadores
            self.long_break_counter = 0
            self.short_break_counter = 0
            self._long_break_threshold = random.randint(*self.config.long_break_every)
            self._short_break_threshold = random.randint(*self.config.short_break_every)
            return True
        
        # Verificar pausa curta
        if self.short_break_counter >= self._short_break_threshold:
            break_duration = random.randint(*self.config.short_break_duration)
            print(f"⏸️ Pausa curta. Aguardando {break_duration/60:.0f} minutos...")
            await asyncio.sleep(break_duration)
            
            # Resetar contador de pausa curta
            self.short_break_counter = 0
            self._short_break_threshold = random.randint(*self.config.short_break_every)
        
        return False
    
    def get_stats(self) -> Dict:
        """Retorna estatísticas do SmartDelay"""
        return {
            "messages_sent": self.messages_sent,
            "next_short_break": self._short_break_threshold - self.short_break_counter,
            "next_long_break": self._long_break_threshold - self.long_break_counter,
            "in_business_hours": self.is_business_hours()
        }


class MessageSender:
    """Gerenciador de envio de mensagens em lote"""
    
    def __init__(self):
        self.wpp = WPPConnectClient()
        self.rate_limiter = RateLimiter()
        self.smart_delay = SmartDelay()
        self.warmup = warmup_manager
        self.running = False
        self.current_campaign_id: Optional[int] = None
        self._task: Optional[asyncio.Task] = None
        self.use_spintax = True
        self.use_typing = True
        self.check_warmup = True
    
    async def start_campaign(self, campaign_id: int):
        """Inicia envio de campanha"""
        if self.running:
            raise Exception("Já existe uma campanha em execução")
        
        campaign = await db.get_campaign(campaign_id)
        if not campaign:
            raise Exception("Campanha não encontrada")
        
        if campaign.status == CampaignStatus.COMPLETED:
            raise Exception("Campanha já foi concluída")
        
        self.running = True
        self.current_campaign_id = campaign_id
        
        # Atualizar status
        await db.update_campaign_status(campaign_id, CampaignStatus.RUNNING)
        
        # Iniciar task de envio
        self._task = asyncio.create_task(self._send_loop(campaign_id))
    
    async def _send_loop(self, campaign_id: int):
        """Loop principal de envio"""
        try:
            campaign = await db.get_campaign(campaign_id)
            
            if not campaign:
                self.running = False
                return
            
            while self.running:
                # Buscar mensagens pendentes
                messages = await db.get_pending_messages(campaign_id, limit=10)
                
                if not messages:
                    # Verificar se ainda há mensagens em outros status
                    stats = await db.get_messages_stats(campaign_id)
                    if stats['pending'] == 0:
                        # Campanha concluída
                        await db.update_campaign_status(campaign_id, CampaignStatus.COMPLETED)
                        await db.update_campaign_counts(campaign_id)
                        break
                
                for message in messages:
                    if not self.running:
                        break
                    
                    try:
                        # Aguardar slot de rate limit
                        await self.rate_limiter.wait_for_slot()
                        
                        # Verificar warm-up do chip (se habilitado)
                        instance_name = "avelar-session"  # Nome padrão da sessão
                        if self.check_warmup:
                            warmup_check = await self.warmup.can_send(instance_name)
                            
                            if not warmup_check['allowed']:
                                # Chip em warm-up, salvar mensagem para depois
                                await db.update_message_status(
                                    message.id,
                                    MessageStatus.PENDING,
                                    f"Warm-up: {warmup_check['reason']}"
                                )
                                continue
                        
                        # Verificar e fazer pausas se necessário
                        await self.smart_delay.check_and_do_break()
                        
                        # Aplicar spintax na mensagem
                        processed_message = message.message
                        if self.use_spintax:
                            variables = {
                                'nome': message.phone,  # Fallback se não tiver nome
                                'telefone': message.phone
                            }
                            processed_message = spintax.parse(message.message, variables)
                        
                        # Calcular delay humanizado baseado no tamanho da mensagem
                        await self.smart_delay.delay_before_message(len(processed_message))
                        
                        # Atualizar status para enviando
                        await db.update_message_status(message.id, MessageStatus.SENDING)
                        
                        # Enviar mensagem com typing
                        result = await self.wpp.send_message(
                            message.phone,
                            processed_message,
                            typing=self.use_typing
                        )
                        
                        if result["success"]:
                            await db.update_message_status(message.id, MessageStatus.SENT)
                            
                            # Registrar envio no warm-up
                            if self.check_warmup:
                                await self.warmup.record_send(instance_name)
                        else:
                            await db.update_message_status(
                                message.id, 
                                MessageStatus.FAILED,
                                result.get("error", "Erro desconhecido")
                            )
                        
                        # Atualizar contagens
                        await db.update_campaign_counts(campaign_id)
                        
                    except Exception as e:
                        await db.update_message_status(
                            message.id,
                            MessageStatus.FAILED,
                            str(e)
                        )
                        await db.update_campaign_counts(campaign_id)
                
                # Pequena pausa entre lotes
                await asyncio.sleep(1)
                
        except Exception as e:
            await db.update_campaign_status(campaign_id, CampaignStatus.ERROR)
        finally:
            self.running = False
            self.current_campaign_id = None
    
    async def pause_campaign(self):
        """Pausa campanha atual"""
        if self.running and self.current_campaign_id:
            self.running = False
            if self._task:
                self._task.cancel()
                try:
                    await self._task
                except asyncio.CancelledError:
                    pass
            
            await db.update_campaign_status(
                self.current_campaign_id, 
                CampaignStatus.PAUSED
            )
    
    async def cancel_campaign(self, campaign_id: int):
        """Cancela campanha"""
        if self.current_campaign_id == campaign_id:
            await self.pause_campaign()
        
        await db.update_campaign_status(campaign_id, CampaignStatus.CANCELLED)
    
    async def get_status(self) -> Dict:
        """Retorna status do sender"""
        return {
            "running": self.running,
            "current_campaign_id": self.current_campaign_id,
            "rate_limit": self.rate_limiter.get_stats()
        }
    
    async def close(self):
        """Fecha conexões"""
        await self.pause_campaign()
        await self.wpp.close()


# Instância global
sender = MessageSender()