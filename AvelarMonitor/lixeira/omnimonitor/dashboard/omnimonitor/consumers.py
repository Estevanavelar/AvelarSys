import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import System, AgentToken, Metric

logger = logging.getLogger('omnimonitor')


class AgentConsumer(AsyncWebsocketConsumer):
    """Consumer para conexão dos agents"""

    async def connect(self):
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'system') and self.system:
            await self.update_system_status('offline')

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            logger.debug(f"Received message type: {message_type}")

            if message_type == 'auth':
                await self.handle_auth(data)
            elif message_type == 'metrics':
                await self.handle_metrics(data)
            elif message_type == 'pong':
                pass
            else:
                await self.send_error(f"Unknown message type: {message_type}")

        except json.JSONDecodeError:
            await self.send_error("Invalid JSON")
        except Exception as e:
            logger.error(f"Error in receive: {e}")
            await self.send_error(str(e))

    async def handle_auth(self, data):
        """Processa autenticação do agent"""
        token_str = data.get('token')
        system_id = data.get('system_id')
        system_info = data.get('system_info', {})

        try:
            token = await self.get_token(token_str)
            
            if not token:
                await self.send_error("Invalid token")
                await self.close()
                return

            self.system = await self.get_or_create_system(system_id, system_info)

            if not self.system:
                await self.send_error("Error creating system")
                await self.close()
                return

            await self.send_json({
                'type': 'auth_success',
                'system_id': self.system.system_id
            })

            await self.update_system_status('online')
            logger.info(f"Agent authenticated: {self.system.hostname}")

        except Exception as e:
            logger.error(f"Auth error: {e}")
            await self.send_error(f"Auth error: {e}")
            await self.close()

    async def handle_metrics(self, data):
        """Processa métricas recebidas"""
        if not hasattr(self, 'system') or not self.system:
            await self.send_error("Not authenticated")
            return

        metrics_data = data.get('data', {})

        await self.update_last_seen()
        
        await self.save_metrics(self.system, metrics_data)

        await self.send_json({'type': 'metrics_received'})

    async def update_system_status(self, status):
        """Atualiza status do sistema"""
        if hasattr(self, 'system') and self.system:
            await self.set_system_status(self.system, status)

    async def update_last_seen(self):
        """Atualiza última conexão"""
        if hasattr(self, 'system') and self.system:
            await self.set_system_last_seen(self.system)

    async def send_json(self, data):
        """Envia mensagem JSON"""
        await self.send(json.dumps(data))

    async def send_error(self, message):
        """Envia mensagem de erro"""
        await self.send_json({'type': 'error', 'message': message})

    @database_sync_to_async
    def get_token(self, token_str):
        """Busca token no banco"""
        try:
            return AgentToken.objects.get(token=token_str, is_active=True)
        except AgentToken.DoesNotExist:
            return None

    @database_sync_to_async
    def get_or_create_system(self, system_id, system_info):
        """Busca ou cria sistema"""
        try:
            system = System.objects.get(system_id=system_id)
            system.hostname = system_info.get('hostname', system.hostname)
            system.platform = system_info.get('platform', system.platform)
            system.platform_release = system_info.get('platform_release', system.platform_release)
            system.architecture = system_info.get('architecture', system.architecture)
            system.agent_version = system_info.get('agent_version', system.agent_version)
            system.status = 'online'
            system.last_seen = timezone.now()
            system.save()
            return system
        except System.DoesNotExist:
            system = System.objects.create(
                system_id=system_id,
                hostname=system_info.get('hostname', 'Unknown'),
                platform=system_info.get('platform', 'Unknown'),
                platform_release=system_info.get('platform_release', ''),
                architecture=system_info.get('architecture', ''),
                agent_version=system_info.get('agent_version', ''),
                status='online',
                last_seen=timezone.now()
            )
            return system

    @database_sync_to_async
    def set_system_status(self, system, status):
        """Define status do sistema"""
        system.status = status
        system.last_seen = timezone.now()
        system.save()

    @database_sync_to_async
    def set_system_last_seen(self, system):
        """Atualiza última conexão"""
        system.last_seen = timezone.now()
        system.status = 'online'
        system.save()

    @database_sync_to_async
    def save_metrics(self, system, metrics_data):
        """Salva métricas no banco"""
        timestamp = metrics_data.get('timestamp')

        cpu = metrics_data.get('cpu', {})
        memory = metrics_data.get('memory', {})
        disk = metrics_data.get('disk', {})
        network = metrics_data.get('network', {})
        uptime = metrics_data.get('uptime', {})

        metrics_to_create = []

        if cpu:
            metrics_to_create.append(Metric(
                system=system,
                metric_type='cpu_percent',
                value=cpu.get('percent', 0),
                unit='%',
                metadata=cpu
            ))

            metrics_to_create.append(Metric(
                system=system,
                metric_type='cpu_load_1',
                value=uptime.get('loadavg', [0, 0, 0])[0] if uptime.get('loadavg') else 0,
                unit='',
                metadata={'source': 'uptime'}
            ))

        if memory:
            metrics_to_create.append(Metric(
                system=system,
                metric_type='memory_percent',
                value=memory.get('percent', 0),
                unit='%',
                metadata=memory
            ))

            metrics_to_create.append(Metric(
                system=system,
                metric_type='memory_used',
                value=memory.get('used', 0),
                unit='bytes',
                metadata=memory
            ))

            if memory.get('swap'):
                metrics_to_create.append(Metric(
                    system=system,
                    metric_type='swap_percent',
                    value=memory['swap'].get('percent', 0),
                    unit='%',
                    metadata=memory['swap']
                ))

        if disk and disk.get('partitions'):
            for partition in disk['partitions']:
                metrics_to_create.append(Metric(
                    system=system,
                    metric_type='disk_percent',
                    value=partition.get('percent', 0),
                    unit='%',
                    metadata=partition
                ))

                metrics_to_create.append(Metric(
                    system=system,
                    metric_type='disk_used',
                    value=partition.get('used', 0),
                    unit='bytes',
                    metadata=partition
                ))

        if network and network.get('io'):
            metrics_to_create.append(Metric(
                system=system,
                metric_type='network_bytes_sent',
                value=network['io'].get('bytes_sent', 0),
                unit='bytes',
                metadata=network['io']
            ))

            metrics_to_create.append(Metric(
                system=system,
                metric_type='network_bytes_recv',
                value=network['io'].get('bytes_recv', 0),
                unit='bytes',
                metadata=network['io']
            ))

        if uptime:
            metrics_to_create.append(Metric(
                system=system,
                metric_type='uptime_seconds',
                value=uptime.get('uptime_seconds', 0),
                unit='seconds',
                metadata=uptime
            ))

        Metric.objects.bulk_create(metrics_to_create, ignore_conflicts=True)


class DashboardConsumer(AsyncWebsocketConsumer):
    """Consumer para o dashboard (recebe atualizações em tempo real)"""

    async def connect(self):
        self.system_id = self.scope['url_route']['kwargs'].get('system_id')
        
        if self.system_id:
            await self.channel_layer.group_add(f'system_{self.system_id}', self.channel_name)
        else:
            await self.channel_layer.group_add('dashboard', self.channel_name)
        
        await self.accept()

    async def disconnect(self, close_code):
        if self.system_id:
            await self.channel_layer.group_discard(f'system_{self.system_id}', self.channel_name)
        else:
            await self.channel_layer.group_discard('dashboard', self.channel_name)

    async def receive(self, text_data):
        pass

    async def metrics_update(self, event):
        """Envia atualização de métricas para o dashboard"""
        await self.send(text_data=json.dumps(event['data']))

    async def alert_update(self, event):
        """Envia atualização de alerta para o dashboard"""
        await self.send(text_data=json.dumps(event['data']))

    async def system_status_update(self, event):
        """Envia atualização de status do sistema para o dashboard"""
        await self.send(text_data=json.dumps(event['data']))
