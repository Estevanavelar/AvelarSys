"""Utilitários para coleta de métricas do sistema"""
import psutil
import json
from datetime import datetime


def get_cpu_info():
    """Retorna informações sobre CPU"""
    return {
        'percent': psutil.cpu_percent(interval=1),
        'count': psutil.cpu_count(),
        'freq': {
            'current': psutil.cpu_freq().current if psutil.cpu_freq() else 0,
            'max': psutil.cpu_freq().max if psutil.cpu_freq() else 0,
        },
        'per_cpu': psutil.cpu_percent(interval=1, percpu=True),
    }


def get_memory_info():
    """Retorna informações sobre memória"""
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    
    return {
        'total': mem.total / (1024**3),  # GB
        'available': mem.available / (1024**3),  # GB
        'used': mem.used / (1024**3),  # GB
        'percent': mem.percent,
        'swap': {
            'total': swap.total / (1024**3),  # GB
            'used': swap.used / (1024**3),  # GB
            'free': swap.free / (1024**3),  # GB
            'percent': swap.percent,
        }
    }


def get_disk_info(path='/'):
    """Retorna informações sobre disco"""
    disk = psutil.disk_usage(path)
    
    # Informações do Docker
    docker_info = get_docker_disk_usage()
    
    return {
        'total': disk.total / (1024**3),  # GB
        'used': disk.used / (1024**3),  # GB
        'free': disk.free / (1024**3),  # GB
        'percent': disk.percent,
        'docker': docker_info,
    }


def get_docker_disk_usage():
    """Retorna informações sobre uso de disco do Docker"""
    try:
        import subprocess
        import re
        
        # Executar docker system df (formato simples)
        result = subprocess.run(
            ['docker', 'system', 'df'],
            capture_output=True,
            text=True,
            timeout=15
        )
        
        if result.returncode != 0:
            return None
        
        # Parse manual do output
        lines = result.stdout.strip().split('\n')
        docker_data = {}
        total_docker = 0.0
        total_reclaimable = 0.0
        
        for line in lines[1:]:  # Pular cabeçalho
            if not line.strip() or 'TYPE' in line:
                continue
            
            # Regex para parsear: TYPE TOTAL ACTIVE SIZE RECLAIMABLE
            # Exemplo: "Images          17        8         89.86GB   82.75GB (92%)"
            # Exemplo: "Build Cache     581       0         85.67GB   74.58GB"
            match = re.match(r'(\w+(?:\s+\w+)?)\s+(\d+)\s+(\d+)\s+([\d.]+)(\w+)\s+([\d.]+)(\w+)(?:\s*\(|$)', line)
            if match:
                type_name = match.group(1).strip()
                size_value = float(match.group(4))
                size_unit = match.group(5).upper()
                reclaimable_value = float(match.group(6))
                reclaimable_unit = match.group(7).upper()
                
                # Converter para GB
                size_gb = size_value
                if size_unit == 'MB':
                    size_gb = size_value / 1024.0
                elif size_unit == 'KB':
                    size_gb = size_value / (1024.0 ** 2)
                elif size_unit == 'B':
                    size_gb = size_value / (1024.0 ** 3)
                
                reclaimable_gb = reclaimable_value
                if reclaimable_unit == 'MB':
                    reclaimable_gb = reclaimable_value / 1024.0
                elif reclaimable_unit == 'KB':
                    reclaimable_gb = reclaimable_value / (1024.0 ** 2)
                elif reclaimable_unit == 'B':
                    reclaimable_gb = reclaimable_value / (1024.0 ** 3)
                
                docker_data[type_name] = {
                    'size': size_gb,
                    'reclaimable': reclaimable_gb,
                }
                
                total_docker += size_gb
                total_reclaimable += reclaimable_gb
        
        return {
            'total': total_docker,
            'reclaimable': total_reclaimable,
            'breakdown': docker_data,
        }
    except subprocess.TimeoutExpired:
        return {'error': 'Timeout ao consultar Docker'}
    except Exception as e:
        return {'error': str(e)}


def parse_size(size_str):
    """Converte string de tamanho (ex: '85.67GB') para GB (float)"""
    if not size_str or size_str == '0B':
        return 0.0
    
    try:
        # Remover espaços e converter para maiúsculas
        size_str = size_str.strip().upper()
        
        # Extrair número e unidade
        if 'GB' in size_str:
            num = float(size_str.replace('GB', '').strip())
            return num
        elif 'MB' in size_str:
            num = float(size_str.replace('MB', '').strip())
            return num / 1024.0
        elif 'KB' in size_str:
            num = float(size_str.replace('KB', '').strip())
            return num / (1024.0 ** 2)
        elif 'B' in size_str:
            num = float(size_str.replace('B', '').strip())
            return num / (1024.0 ** 3)
        else:
            # Tentar parse direto
            return float(size_str)
    except (ValueError, AttributeError):
        return 0.0


def get_network_info():
    """Retorna informações sobre rede"""
    net_io = psutil.net_io_counters()
    
    return {
        'bytes_sent': net_io.bytes_sent / (1024**2),  # MB
        'bytes_recv': net_io.bytes_recv / (1024**2),  # MB
        'packets_sent': net_io.packets_sent,
        'packets_recv': net_io.packets_recv,
    }


def get_processes_info(limit=20):
    """Retorna lista de processos mais pesados"""
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'username']):
        try:
            processes.append(proc.info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    
    # Ordenar por uso de CPU
    processes.sort(key=lambda x: x['cpu_percent'] or 0, reverse=True)
    return processes[:limit]


def get_all_metrics():
    """Retorna todas as métricas do sistema"""
    return {
        'timestamp': datetime.now().isoformat(),
        'cpu': get_cpu_info(),
        'memory': get_memory_info(),
        'disk': get_disk_info(),
        'network': get_network_info(),
        'processes': get_processes_info(),
    }

