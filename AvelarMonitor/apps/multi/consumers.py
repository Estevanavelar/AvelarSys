import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from apps.multi.models import Server, AgentToken, Metric

logger = logging.getLogger('omnimonitor')


class AgentConsumer(AsyncWebsocketConsumer):
    """Consumer para conexão dos agents"""

    async def connect(self):
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'server') and self.server:
            await self.update_server_status('offline')

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
        server_id = data.get('server_id')
        system_info = data.get('system_info', {})

        try:
            token = await self.get_token(token_str)
            
            if not token:
                await self.send_error("Invalid token")
                await self.close()
                return

            self.server = await self.get_or_create_server(server_id, system_info)

            if not self.server:
                await self.send_error("Error creating server")
                await self.close()
                return

            await self.send_json({
                'type': 'auth_success',
                'server_id': self.server.server_id
            })

            await self.update_server_status('online')
            logger.info(f"Agent authenticated: {self.server.hostname}")

        except Exception as e:
            logger.error(f"Auth error: {e}")
            await self.send_error(f"Auth error: {e}")
            await self.close()

    async def handle_metrics(self, data):
        """Processa métricas recebidas"""
        if not hasattr(self, 'server') or not self.server:
            await self.send_error("Not authenticated")
            return

        metrics_data = data.get('data', {})

        await self.update_last_seen()
        
        await self.save_metrics(self.server, metrics_data)

        await self.send_json({'type': 'metrics_received'})

    async def update_server_status(self, status):
        """Atualiza status do servidor"""
        if hasattr(self, 'server') and self.server:
            await self.set_server_status(self.server, status)

    async def update_last_seen(self):
        """Atualiza última conexão"""
        if hasattr(self, 'server') and self.server:
            await self.set_server_last_seen(self.server)

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
    def get_or_create_server(self, server_id, system_info):
        """Busca ou cria servidor"""
        try:
            server = Server.objects.get(server_id=server_id)
            server.hostname = system_info.get('hostname', server.hostname)
            server.platform = system_info.get('platform', server.platform)
            server.platform_release = system_info.get('platform_release', server.platform_release)
            server.architecture = system_info.get('architecture', server.architecture)
            server.agent_version = system_info.get('agent_version', server.agent_version)
            server.status = 'online'
            server.last_seen = timezone.now()
            server.save()
            return server
        except Server.DoesNotExist:
            server = Server.objects.create(
                server_id=server_id,
                hostname=system_info.get('hostname', 'Unknown'),
                platform=system_info.get('platform', 'Unknown'),
                platform_release=system_info.get('platform_release', ''),
                architecture=system_info.get('architecture', ''),
                agent_version=system_info.get('agent_version', ''),
                status='online',
                last_seen=timezone.now()
            )
            return server

    @database_sync_to_async
    def set_server_status(self, server, status):
        """Define status do servidor"""
        server.status = status
        server.last_seen = timezone.now()
        server.save()

    @database_sync_to_async
    def set_server_last_seen(self, server):
        """Atualiza última conexão"""
        server.last_seen = timezone.now()
        server.status = 'online'
        server.save()

    @database_sync_to_async
    def save_metrics(self, server, metrics_data):
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
                server=server,
                metric_type='cpu_percent',
                value=cpu.get('percent', 0),
                unit='%',
                metadata=cpu
            ))

            metrics_to_create.append(Metric(
                server=server,
                metric_type='cpu_load_1',
                value=uptime.get('loadavg', [0, 0, 0])[0] if uptime.get('loadavg') else 0,
                unit='',
                metadata={'source': 'uptime'}
            ))

        if memory:
            metrics_to_create.append(Metric(
                server=server,
                metric_type='memory_percent',
                value=memory.get('percent', 0),
                unit='%',
                metadata=memory
            ))

            metrics_to_create.append(Metric(
                server=server,
                metric_type='memory_used',
                value=memory.get('used', 0),
                unit='bytes',
                metadata=memory
            ))

            if memory.get('swap'):
                metrics_to_create.append(Metric(
                    server=server,
                    metric_type='swap_percent',
                    value=memory['swap'].get('percent', 0),
                    unit='%',
                    metadata=memory['swap']
                ))

        if disk and disk.get('partitions'):
            for partition in disk['partitions']:
                metrics_to_create.append(Metric(
                    server=server,
                    metric_type='disk_percent',
                    value=partition.get('percent', 0),
                    unit='%',
                    metadata=partition
                ))

                metrics_to_create.append(Metric(
                    server=server,
                    metric_type='disk_used',
                    value=partition.get('used', 0),
                    unit='bytes',
                    metadata=partition
                ))

        if network and network.get('io'):
            metrics_to_create.append(Metric(
                server=server,
                metric_type='network_bytes_sent',
                value=network['io'].get('bytes_sent', 0),
                unit='bytes',
                metadata=network['io']
            ))

            metrics_to_create.append(Metric(
                server=server,
                metric_type='network_bytes_recv',
                value=network['io'].get('bytes_recv', 0),
                unit='bytes',
                metadata=network['io']
            ))

        if uptime:
            metrics_to_create.append(Metric(
                server=server,
                metric_type='uptime_seconds',
                value=uptime.get('uptime_seconds', 0),
                unit='seconds',
                metadata=uptime
            ))

        Metric.objects.bulk_create(metrics_to_create, ignore_conflicts=True)


class DashboardConsumer(AsyncWebsocketConsumer):
    """Consumer para o dashboard (recebe atualizações em tempo real)"""

    async def connect(self):
        self.server_id = self.scope['url_route']['kwargs'].get('server_id')
        
        if self.server_id:
            await self.channel_layer.group_add(f'server_{self.server_id}', self.channel_name)
        else:
            await self.channel_layer.group_add('dashboard', self.channel_name)
        
        await self.accept()

    async def disconnect(self, close_code):
        if self.server_id:
            await self.channel_layer.group_discard(f'server_{self.server_id}', self.channel_name)
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

    async def server_status_update(self, event):
        """Envia atualização de status do servidor para o dashboard"""
        await self.send(text_data=json.dumps(event['data']))
