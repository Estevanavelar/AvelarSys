"""Utilitários para interagir com Docker"""
import docker
from datetime import datetime, timedelta


def get_docker_client():
    """Retorna cliente Docker"""
    try:
        return docker.from_env()
    except docker.errors.DockerException as e:
        error_msg = str(e)
        if "Permission denied" in error_msg or "permission" in error_msg.lower():
            raise Exception(
                "Erro de permissão ao acessar Docker. "
                "O usuário precisa estar no grupo 'docker'. "
                "Execute: sudo usermod -aG docker $USER && newgrp docker"
            )
        raise Exception(f"Erro ao conectar com Docker: {error_msg}")
    except Exception as e:
        error_msg = str(e)
        if "Permission denied" in error_msg or "permission" in error_msg.lower():
            raise Exception(
                "Erro de permissão ao acessar Docker. "
                "O usuário precisa estar no grupo 'docker'. "
                "Execute: sudo usermod -aG docker $USER && newgrp docker"
            )
        raise Exception(f"Erro ao conectar com Docker: {error_msg}")


def get_containers_list():
    """Retorna lista de containers"""
    try:
        client = get_docker_client()
        containers = client.containers.list(all=True)
        
        containers_list = []
        for container in containers:
            stats = None
            try:
                stats = container.stats(stream=False)
            except:
                pass
            
            container_info = {
                'id': container.id[:12],
                'name': container.name,
                'image': container.image.tags[0] if container.image.tags else container.image.id[:12],
                'status': container.status,
                'created': container.attrs['Created'],
                'ports': container.attrs.get('NetworkSettings', {}).get('Ports', {}),
            }
            
            # Adicionar health check se disponível
            health = container.attrs.get('State', {}).get('Health', {}).get('Status')
            if health:
                container_info['health'] = health
            
            # Calcular uptime
            created = datetime.fromisoformat(container.attrs['Created'].replace('Z', '+00:00'))
            uptime = datetime.now(created.tzinfo) - created
            container_info['uptime'] = str(uptime).split('.')[0]
            
            # Adicionar estatísticas se disponíveis
            if stats:
                try:
                    cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - stats['precpu_stats']['cpu_usage']['total_usage']
                    system_delta = stats['cpu_stats']['system_cpu_usage'] - stats['precpu_stats']['system_cpu_usage']
                    if system_delta > 0:
                        # Tentar obter número de CPUs
                        num_cpus = 1
                        if 'percpu_usage' in stats['cpu_stats']['cpu_usage']:
                            num_cpus = len(stats['cpu_stats']['cpu_usage']['percpu_usage'])
                        elif 'online_cpus' in stats['cpu_stats']:
                            num_cpus = stats['cpu_stats']['online_cpus']
                        
                        cpu_percent = (cpu_delta / system_delta) * num_cpus * 100
                        container_info['cpu_percent'] = round(cpu_percent, 2)
                    else:
                        container_info['cpu_percent'] = 0
                except (KeyError, ZeroDivisionError):
                    container_info['cpu_percent'] = 0
                
                try:
                    memory_usage = stats['memory_stats'].get('usage', 0)
                    memory_limit = stats['memory_stats'].get('limit', 0)
                    if memory_limit > 0:
                        container_info['memory_percent'] = round((memory_usage / memory_limit) * 100, 2)
                        container_info['memory_usage'] = memory_usage / (1024**2)  # MB
                        container_info['memory_limit'] = memory_limit / (1024**2)  # MB
                    else:
                        container_info['memory_percent'] = 0
                        container_info['memory_usage'] = 0
                        container_info['memory_limit'] = 0
                except (KeyError, ZeroDivisionError):
                    container_info['memory_percent'] = 0
                    container_info['memory_usage'] = 0
                    container_info['memory_limit'] = 0
            
            containers_list.append(container_info)
        
        return containers_list
    except Exception as e:
        raise Exception(f"Erro ao listar containers: {str(e)}")


def get_container_logs(container_id, tail=100):
    """Retorna logs de um container"""
    try:
        client = get_docker_client()
        container = client.containers.get(container_id)
        logs = container.logs(tail=tail, timestamps=True).decode('utf-8', errors='replace')
        return logs.split('\n')
    except Exception as e:
        raise Exception(f"Erro ao obter logs: {str(e)}")


def container_action(container_id, action):
    """Executa ação em um container (start, stop, restart, pause, unpause)"""
    try:
        client = get_docker_client()
        container = client.containers.get(container_id)
        
        if action == 'start':
            container.start()
        elif action == 'stop':
            container.stop()
        elif action == 'restart':
            container.restart()
        elif action == 'pause':
            container.pause()
        elif action == 'unpause':
            container.unpause()
        else:
            raise ValueError(f"Ação inválida: {action}")
        
        return True
    except Exception as e:
        raise Exception(f"Erro ao executar ação: {str(e)}")


def get_images_list():
    """Retorna lista de imagens Docker"""
    try:
        client = get_docker_client()
        images = client.images.list(all=True)
        
        images_list = []
        for image in images:
            # Converter timestamp para datetime
            created_timestamp = image.attrs['Created']
            if isinstance(created_timestamp, (int, float)):
                from datetime import datetime
                created_dt = datetime.fromtimestamp(created_timestamp)
            else:
                # Se já for string ISO, tentar parsear
                try:
                    from datetime import datetime
                    created_dt = datetime.fromisoformat(created_timestamp.replace('Z', '+00:00'))
                except:
                    created_dt = None
            
            image_info = {
                'id': image.id[:12],
                'tags': image.tags if image.tags else ['<none>'],
                'size': image.attrs['Size'] / (1024**2),  # MB
                'created': created_dt if created_dt else created_timestamp,
            }
            images_list.append(image_info)
        
        return images_list
    except Exception as e:
        raise Exception(f"Erro ao listar imagens: {str(e)}")

