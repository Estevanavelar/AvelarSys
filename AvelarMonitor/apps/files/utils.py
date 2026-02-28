"""Utilitários para manipulação de arquivos"""
import os
import shutil
from pathlib import Path
from django.conf import settings


def is_restricted_path(path):
    """Verifica se o caminho está em diretórios restritos para operações de escrita/deleção"""
    # Permitir visualização de TODOS os diretórios, incluindo críticos
    # Esta função agora apenas bloqueia operações de escrita/deleção em diretórios críticos
    path = os.path.abspath(path)
    
    # Diretórios críticos onde apenas visualização é permitida (sem escrita/deleção)
    critical_dirs = [
        '/proc',  # Sistema de processos
        '/sys',   # Sistema de arquivos do kernel
        '/dev',   # Dispositivos do sistema
        '/boot',  # Arquivos de boot
        '/etc',   # Configurações do sistema
    ]
    
    # Verificar se está em diretório crítico
    for critical in critical_dirs:
        if path.startswith(critical):
            return True
    
    # Permitir navegação e operações em todos os outros diretórios
    return False


def is_read_only_path(path):
    """Verifica se o caminho está em diretório apenas leitura (pode visualizar, mas não modificar)"""
    path = os.path.abspath(path)
    
    # Diretórios que podem ser visualizados mas não modificados
    read_only_dirs = [
        '/proc',
        '/sys',
        '/dev',
        '/boot',
        '/etc',
    ]
    
    for read_only in read_only_dirs:
        if path.startswith(read_only):
            return True
    
    return False


def get_directory_size(directory, max_depth=None, timeout=30):
    """Calcula o tamanho total de um diretório recursivamente"""
    import time
    start_time = time.time()
    total_size = 0
    try:
        depth = 0
        for dirpath, dirnames, filenames in os.walk(directory):
            # Verificar timeout
            if time.time() - start_time > timeout:
                break
            
            # Verificar profundidade máxima (opcional)
            if max_depth is not None:
                current_depth = dirpath[len(directory):].count(os.sep)
                if current_depth >= max_depth:
                    dirnames[:] = []  # Não entrar em subdiretórios
                    continue
            
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                try:
                    total_size += os.path.getsize(filepath)
                except (OSError, PermissionError):
                    pass
    except (OSError, PermissionError):
        pass
    return total_size


def get_file_info(filepath, calculate_dir_size=True):
    """Retorna informações sobre um arquivo"""
    if not os.path.exists(filepath):
        return None
    
    stat = os.stat(filepath)
    is_dir = os.path.isdir(filepath)
    
    # Calcular tamanho
    if is_dir:
        if calculate_dir_size:
            try:
                size = get_directory_size(filepath)
            except:
                size = 0
        else:
            size = 0
    else:
        size = stat.st_size
    
    info = {
        'name': os.path.basename(filepath),
        'path': filepath,
        'is_dir': is_dir,
        'size': size,
        'modified': stat.st_mtime,
        'permissions': oct(stat.st_mode)[-3:],
        'owner': stat.st_uid,
        'group': stat.st_gid,
    }
    
    if is_dir:
        try:
            info['items_count'] = len(os.listdir(filepath))
        except:
            info['items_count'] = 0
    
    return info


def list_directory(directory, calculate_dir_sizes=True):
    """Lista conteúdo de um diretório (permite visualizar todos, incluindo críticos)"""
    if not os.path.exists(directory) or not os.path.isdir(directory):
        return []
    
    # Permitir listar TODOS os diretórios, incluindo críticos
    # is_restricted_path agora só bloqueia escrita/deleção, não visualização
    
    items = []
    try:
        for item in os.listdir(directory):
            item_path = os.path.join(directory, item)
            # Para pastas grandes, não calcular tamanho recursivo por padrão (pode ser lento)
            # Mas permitir cálculo opcional
            item_info = get_file_info(item_path, calculate_dir_size=calculate_dir_sizes)
            if item_info:
                # Adicionar flag de read-only para diretórios críticos
                item_info['is_read_only'] = is_read_only_path(item_path)
                items.append(item_info)
        
        # Ordenar: diretórios primeiro, depois por nome
        items.sort(key=lambda x: (not x['is_dir'], x['name'].lower()))
    except (PermissionError, OSError) as e:
        # Mesmo com erro de permissão, tentar retornar o que conseguir
        pass
    
    return items


def safe_delete(path):
    """Deleta arquivo ou diretório de forma segura"""
    if is_restricted_path(path):
        raise ValueError("Não é permitido deletar este caminho")
    
    if not os.path.exists(path):
        raise FileNotFoundError("Arquivo ou diretório não encontrado")
    
    if os.path.isdir(path):
        shutil.rmtree(path)
    else:
        os.remove(path)
    
    return True


def safe_create_directory(path, name):
    """Cria um novo diretório de forma segura"""
    new_path = os.path.join(path, name)
    
    if is_restricted_path(new_path):
        raise ValueError("Não é permitido criar neste caminho")
    
    if os.path.exists(new_path):
        raise ValueError("Diretório já existe")
    
    os.makedirs(new_path, exist_ok=False)
    return new_path


def safe_create_file(path, name, content=''):
    """Cria um novo arquivo de forma segura"""
    new_path = os.path.join(path, name)
    
    if is_restricted_path(new_path):
        raise ValueError("Não é permitido criar neste caminho")
    
    if os.path.exists(new_path):
        raise ValueError("Arquivo já existe")
    
    with open(new_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return new_path


def read_file_content(filepath, max_size=10*1024*1024):  # 10MB
    """Lê conteúdo de um arquivo"""
    if is_restricted_path(filepath):
        raise ValueError("Não é permitido ler este arquivo")
    
    if not os.path.exists(filepath) or os.path.isdir(filepath):
        raise FileNotFoundError("Arquivo não encontrado")
    
    stat = os.stat(filepath)
    if stat.st_size > max_size:
        raise ValueError(f"Arquivo muito grande (máximo: {max_size} bytes)")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        # Tentar como binário
        with open(filepath, 'rb') as f:
            return f.read()


def write_file_content(filepath, content):
    """Escreve conteúdo em um arquivo"""
    if is_restricted_path(filepath):
        raise ValueError("Não é permitido escrever neste arquivo")
    
    # Verificar se é texto ou binário
    if isinstance(content, str):
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
    else:
        with open(filepath, 'wb') as f:
            f.write(content)
    
    return True

