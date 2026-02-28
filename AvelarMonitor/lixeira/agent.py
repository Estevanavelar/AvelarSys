#!/usr/bin/env python3
"""
OmniMonitor Agent - Agent de monitoramento para VPS
"""
import asyncio
import json
import logging
import os
import sys
import platform
import socket
import hashlib
import argparse
from datetime import datetime
import psutil
import websockets
import docker
from docker.errors import DockerException
import paramiko

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('omnimonitor-agent')


class MetricsCollector:
    """Coletor de métricas do sistema"""

    @staticmethod
    def get_system_info():
        """Informações básicas do sistema"""
        return {
            'hostname': socket.gethostname(),
            'platform': platform.system(),
            'platform_release': platform.release(),
            'platform_version': platform.version(),
            'architecture': platform.machine(),
            'processor': platform.processor(),
            'python_version': sys.version,
            'agent_version': '1.0.0'
        }

    @staticmethod
    def get_cpu_metrics():
        """Métricas de CPU"""
        return {
            'percent': psutil.cpu_percent(interval=0.5),
            'count': psutil.cpu_count(),
            'count_physical': psutil.cpu_count(logical=False),
            'freq': {
                'current': psutil.cpu_freq().current if psutil.cpu_freq() else 0,
                'max': psutil.cpu_freq().max if psutil.cpu_freq() else 0,
                'min': psutil.cpu_freq().min if psutil.cpu_freq() else 0,
            },
            'per_cpu': psutil.cpu_percent(interval=0.5, percpu=True),
            'loadavg': os.getloadavg() if hasattr(os, 'getloadavg') else None
        }

    @staticmethod
    def get_memory_metrics():
        """Métricas de memória"""
        mem = psutil.virtual_memory()
        swap = psutil.swap_memory()

        return {
            'total': mem.total,
            'available': mem.available,
            'used': mem.used,
            'free': mem.free,
            'percent': mem.percent,
            'swap': {
                'total': swap.total,
                'used': swap.used,
                'free': swap.free,
                'percent': swap.percent
            }
        }

    @staticmethod
    def get_disk_metrics():
        """Métricas de disco"""
        disks = []
        for partition in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                disks.append({
                    'device': partition.device,
                    'mountpoint': partition.mountpoint,
                    'fstype': partition.fstype,
                    'total': usage.total,
                    'used': usage.used,
                    'free': usage.free,
                    'percent': usage.percent
                })
            except PermissionError:
                continue

        io = psutil.disk_io_counters()
        return {
            'partitions': disks,
            'io': {
                'read_bytes': io.read_bytes,
                'write_bytes': io.write_bytes,
                'read_count': io.read_count,
                'write_count': io.write_count,
            } if io else None
        }

    @staticmethod
    def get_network_metrics():
        """Métricas de rede"""
        io = psutil.net_io_counters()
        interfaces = {}
        for name, addrs in psutil.net_if_addrs().items():
            interfaces[name] = [
                {
                    'family': addr.family.name,
                    'address': addr.address,
                    'netmask': addr.netmask,
                    'broadcast': addr.broadcast
                }
                for addr in addrs
            ]

        connections = psutil.net_connections(kind='inet')

        return {
            'io': {
                'bytes_sent': io.bytes_sent,
                'bytes_recv': io.bytes_recv,
                'packets_sent': io.packets_sent,
                'packets_recv': io.packets_recv,
                'errin': io.errin,
                'errout': io.errout,
                'dropin': io.dropin,
                'dropout': io.dropout,
            } if io else None,
            'interfaces': interfaces,
            'connections_count': len(connections)
        }

    @staticmethod
    def get_processes(limit=20):
        """Top processos por uso de CPU"""
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status', 'cmdline']):
            try:
                pinfo = proc.info
                pinfo['cmdline'] = ' '.join(pinfo['cmdline']) if pinfo['cmdline'] else ''
                processes.append(pinfo)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

        processes.sort(key=lambda x: x['cpu_percent'] or 0, reverse=True)
        return processes[:limit]

    @staticmethod
    def get_uptime():
        """Tempo de uptime"""
        boot_time = psutil.boot_time()
        uptime = datetime.now().timestamp() - boot_time
        return {
            'boot_time': boot_time,
            'uptime_seconds': uptime,
            'uptime_formatted': str(datetime.fromtimestamp(boot_time))
        }

    @staticmethod
    def collect_all():
        """Coleta todas as métricas"""
        return {
            'timestamp': datetime.now().isoformat(),
            'system': MetricsCollector.get_system_info(),
            'cpu': MetricsCollector.get_cpu_metrics(),
            'memory': MetricsCollector.get_memory_metrics(),
            'disk': MetricsCollector.get_disk_metrics(),
            'network': MetricsCollector.get_network_metrics(),
            'processes': MetricsCollector.get_processes(),
            'uptime': MetricsCollector.get_uptime()
        }


class DockerManager:
    """Gerenciador de containers Docker"""

    def __init__(self):
        self.client = None
        self.available = False

    def connect(self):
        """Conecta ao Docker"""
        try:
            self.client = docker.from_env()
            self.client.ping()
            self.available = True
            logger.info("Docker conectado com sucesso")
            return True
        except DockerException as e:
            logger.warning(f"Docker não disponível: {e}")
            self.available = False
            return False

    def get_containers(self):
        """Lista containers"""
        if not self.available:
            return []

        try:
            containers = []
            for container in self.client.containers.list(all=True):
                info = {
                    'id': container.id[:12],
                    'name': container.name,
                    'image': container.image.tags[0] if container.image.tags else container.image.id[:12],
                    'status': container.status,
                    'state': container.attrs['State']['Status'],
                    'created': container.attrs['Created'],
                    'ports': container.attrs.get('NetworkSettings', {}).get('Ports', {})
                }
                containers.append(info)
            return containers
        except Exception as e:
            logger.error(f"Erro ao listar containers: {e}")
            return []

    def get_images(self):
        """Lista imagens"""
        if not self.available:
            return []

        try:
            images = []
            for image in self.client.images.list(all=True):
                info = {
                    'id': image.id[:12],
                    'tags': image.tags if image.tags else ['<none>'],
                    'size': image.attrs['Size'],
                    'created': image.attrs['Created']
                }
                images.append(info)
            return images
        except Exception as e:
            logger.error(f"Erro ao listar imagens: {e}")
            return []

    def get_stats(self, container_id):
        """Estatísticas de um container"""
        if not self.available:
            return None

        try:
            container = self.client.containers.get(container_id)
            stats = container.stats(stream=False)
            return stats
        except Exception as e:
            logger.error(f"Erro ao obter stats: {e}")
            return None

    def execute_command(self, container_id, command):
        """Executa comando no container"""
        if not self.available:
            return None

        try:
            container = self.client.containers.get(container_id)
            result = container.exec_run(command)
            return {
                'exit_code': result.exit_code,
                'output': result.output.decode('utf-8', errors='replace')
            }
        except Exception as e:
            logger.error(f"Erro ao executar comando: {e}")
            return {'error': str(e)}


class CommandExecutor:
    """Executor de comandos no sistema"""

    @staticmethod
    def execute(cmd, timeout=30, shell=True):
        """Executa comando e retorna resultado"""
        import subprocess

        try:
            result = subprocess.run(
                cmd,
                shell=shell,
                timeout=timeout,
                capture_output=True,
                text=True
            )
            return {
                'success': True,
                'exit_code': result.returncode,
                'stdout': result.stdout,
                'stderr': result.stderr
            }
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'error': 'Command timeout'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


class OmniMonitorAgent:
    """Principal do Agent OmniMonitor"""

    def __init__(self, server_url, token, interval=5, docker_enabled=True):
        self.server_url = server_url.replace('http://', 'ws://').replace('https://', 'wss://')
        self.token = token
        self.interval = interval
        self.docker_enabled = docker_enabled

        self.metrics_collector = MetricsCollector()
        self.docker_manager = DockerManager()
        self.command_executor = CommandExecutor()

        if self.docker_enabled:
            self.docker_manager.connect()

        self.system_id = self._generate_system_id()
        logger.info(f"Agent iniciado. System ID: {self.system_id}")

    def _generate_system_id(self):
        """Gera ID único do sistema"""
        info = f"{socket.gethostname()}-{platform.system()}-{platform.machine()}"
        return hashlib.sha256(info.encode()).hexdigest()[:16]

    async def authenticate(self):
        """Autentica com o servidor"""
        return {
            'type': 'auth',
            'token': self.token,
            'system_id': self.system_id,
            'system_info': self.metrics_collector.get_system_info()
        }

    async def send_metrics(self, websocket):
        """Envia métricas periodicamente"""
        metrics = self.metrics_collector.collect_all()

        if self.docker_enabled:
            metrics['docker'] = {
                'containers': self.docker_manager.get_containers(),
                'images': self.docker_manager.get_images(),
                'available': self.docker_manager.available
            }

        await websocket.send(json.dumps({
            'type': 'metrics',
            'data': metrics
        }))

    async def handle_command(self, command):
        """Processa comando recebido do servidor"""
        cmd_type = command.get('type')
        payload = command.get('payload', {})

        try:
            if cmd_type == 'execute':
                result = self.command_executor.execute(payload.get('command'))
                return {'type': 'command_result', 'data': result}

            elif cmd_type == 'docker_execute':
                result = self.docker_manager.execute_command(
                    payload.get('container_id'),
                    payload.get('command')
                )
                return {'type': 'docker_result', 'data': result}

            elif cmd_type == 'docker_stats':
                result = self.docker_manager.get_stats(payload.get('container_id'))
                return {'type': 'docker_stats', 'data': result}

            elif cmd_type == 'reconnect':
                if self.docker_enabled:
                    self.docker_manager.connect()
                return {'type': 'reconnected', 'data': {'success': True}}

            elif cmd_type == 'update_config':
                self.interval = payload.get('interval', self.interval)
                self.docker_enabled = payload.get('docker_enabled', self.docker_enabled)
                if self.docker_enabled:
                    self.docker_manager.connect()
                return {'type': 'config_updated', 'data': {'success': True}}

            else:
                return {'type': 'error', 'data': {'message': f'Unknown command type: {cmd_type}'}}

        except Exception as e:
            logger.error(f"Erro ao processar comando: {e}")
            return {'type': 'error', 'data': {'message': str(e)}}

    async def connect(self):
        """Conecta ao servidor via WebSocket"""
        uri = f"{self.server_url}/ws/agent/"
        logger.info(f"Conectando ao servidor: {uri}")

        retry_delay = 5

        while True:
            try:
                async with websockets.connect(uri) as websocket:
                    logger.info("Conectado ao servidor")

                    await websocket.send(json.dumps(await self.authenticate()))

                    tasks = [
                        self.receive_messages(websocket),
                        self.send_periodic_metrics(websocket)
                    ]

                    await asyncio.gather(*tasks)

            except websockets.exceptions.ConnectionClosed:
                logger.warning("Conexão fechada, reconectando...")
            except Exception as e:
                logger.error(f"Erro de conexão: {e}")

            await asyncio.sleep(retry_delay)

    async def receive_messages(self, websocket):
        """Recebe mensagens do servidor"""
        async for message in websocket:
            try:
                data = json.loads(message)
                logger.debug(f"Mensagem recebida: {data.get('type')}")

                if data.get('type') == 'command':
                    result = await self.handle_command(data)
                    await websocket.send(json.dumps(result))

                elif data.get('type') == 'ping':
                    await websocket.send(json.dumps({'type': 'pong'}))

            except json.JSONDecodeError:
                logger.error("Erro ao decodificar mensagem")

    async def send_periodic_metrics(self, websocket):
        """Envia métricas periodicamente"""
        while True:
            try:
                await self.send_metrics(websocket)
                await asyncio.sleep(self.interval)
            except Exception as e:
                logger.error(f"Erro ao enviar métricas: {e}")
                break

    def run(self):
        """Inicia o agent"""
        try:
            asyncio.run(self.connect())
        except KeyboardInterrupt:
            logger.info("Agent finalizado pelo usuário")


def main():
    parser = argparse.ArgumentParser(description='OmniMonitor Agent')
    parser.add_argument('--server', required=True, help='URL do servidor Dashboard')
    parser.add_argument('--token', required=True, help='Token de autenticação')
    parser.add_argument('--interval', type=int, default=5, help='Intervalo de coleta (segundos)')
    parser.add_argument('--no-docker', action='store_true', help='Desabilitar Docker')
    parser.add_argument('--debug', action='store_true', help='Modo debug')

    args = parser.parse_args()

    if args.debug:
        logging.getLogger('omnimonitor-agent').setLevel(logging.DEBUG)

    agent = OmniMonitorAgent(
        server_url=args.server,
        token=args.token,
        interval=args.interval,
        docker_enabled=not args.no_docker
    )

    agent.run()


if __name__ == '__main__':
    main()
