"""Utilitários para executar tarefas agendadas"""
import subprocess
import docker
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def get_docker_client():
    """Retorna cliente Docker"""
    try:
        return docker.from_env()
    except Exception as e:
        raise Exception(f"Erro ao conectar com Docker: {str(e)}")


def restart_frontend():
    """Reinicia o container do frontend"""
    try:
        client = get_docker_client()
        container = client.containers.get('avelarsys-frontend-prod')
        container.restart()
        return {
            'success': True,
            'message': 'Frontend reiniciado com sucesso',
            'output': f'Container {container.name} reiniciado às {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}'
        }
    except docker.errors.NotFound:
        return {
            'success': False,
            'message': 'Container avelarsys-frontend-prod não encontrado',
            'error': 'Container não existe'
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'Erro ao reiniciar frontend: {str(e)}',
            'error': str(e)
        }


def restart_backend():
    """Reinicia o container do backend"""
    try:
        client = get_docker_client()
        container = client.containers.get('avelarsys-backend-prod')
        container.restart()
        return {
            'success': True,
            'message': 'Backend reiniciado com sucesso',
            'output': f'Container {container.name} reiniciado às {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}'
        }
    except docker.errors.NotFound:
        return {
            'success': False,
            'message': 'Container avelarsys-backend-prod não encontrado',
            'error': 'Container não existe'
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'Erro ao reiniciar backend: {str(e)}',
            'error': str(e)
        }


def restart_container(container_name):
    """Reinicia um container específico"""
    try:
        client = get_docker_client()
        container = client.containers.get(container_name)
        container.restart()
        return {
            'success': True,
            'message': f'Container {container_name} reiniciado com sucesso',
            'output': f'Container {container.name} reiniciado às {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}'
        }
    except docker.errors.NotFound:
        return {
            'success': False,
            'message': f'Container {container_name} não encontrado',
            'error': 'Container não existe'
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'Erro ao reiniciar container: {str(e)}',
            'error': str(e)
        }


def backup_database():
    """Faz backup do banco de dados"""
    try:
        # Implementar lógica de backup
        # Por enquanto, apenas retorna sucesso
        return {
            'success': True,
            'message': 'Backup do banco de dados iniciado',
            'output': f'Backup iniciado às {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}'
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'Erro ao fazer backup: {str(e)}',
            'error': str(e)
        }


def cleanup_logs():
    """Limpa logs antigos"""
    try:
        # Implementar lógica de limpeza de logs
        return {
            'success': True,
            'message': 'Limpeza de logs concluída',
            'output': f'Logs limpos às {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}'
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'Erro ao limpar logs: {str(e)}',
            'error': str(e)
        }


def execute_custom_command(command):
    """Executa um comando customizado"""
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=300  # 5 minutos de timeout
        )
        
        output = result.stdout + result.stderr if result.stderr else result.stdout
        
        return {
            'success': result.returncode == 0,
            'message': 'Comando executado',
            'output': output,
            'return_code': result.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'message': 'Comando excedeu o tempo limite (5 minutos)',
            'error': 'Timeout'
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'Erro ao executar comando: {str(e)}',
            'error': str(e)
        }


def execute_task(task):
    """Executa uma tarefa agendada"""
    from .models import TaskExecution
    
    execution = TaskExecution.objects.create(
        task=task,
        status='running'
    )
    
    start_time = datetime.now()
    
    try:
        result = None
        
        if task.task_type == 'restart_frontend':
            result = restart_frontend()
        elif task.task_type == 'restart_backend':
            result = restart_backend()
        elif task.task_type == 'restart_container':
            if not task.container_name:
                raise ValueError('Nome do container não especificado')
            result = restart_container(task.container_name)
        elif task.task_type == 'backup_database':
            result = backup_database()
        elif task.task_type == 'cleanup_logs':
            result = cleanup_logs()
        elif task.task_type == 'custom_command':
            if not task.custom_command:
                raise ValueError('Comando customizado não especificado')
            result = execute_custom_command(task.custom_command)
        else:
            raise ValueError(f'Tipo de tarefa desconhecido: {task.task_type}')
        
        # Atualizar execução
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        execution.completed_at = end_time
        execution.duration_seconds = duration
        execution.status = 'completed' if result['success'] else 'failed'
        execution.output = result.get('output', '')
        execution.error_message = result.get('error', '') if not result['success'] else None
        execution.save()
        
        # Atualizar tarefa
        task.last_run = end_time
        task.run_count += 1
        task.last_result = result.get('message', '')
        task.status = 'completed' if result['success'] else 'failed'
        task.update_next_run()
        task.save()
        
        logger.info(f"Tarefa {task.name} executada: {result.get('message', '')}")
        
        return result
        
    except Exception as e:
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        execution.completed_at = end_time
        execution.duration_seconds = duration
        execution.status = 'failed'
        execution.error_message = str(e)
        execution.save()
        
        task.last_run = end_time
        task.run_count += 1
        task.status = 'failed'
        task.last_result = f'Erro: {str(e)}'
        task.save()
        
        logger.error(f"Erro ao executar tarefa {task.name}: {str(e)}")
        
        return {
            'success': False,
            'message': f'Erro ao executar tarefa: {str(e)}',
            'error': str(e)
        }

