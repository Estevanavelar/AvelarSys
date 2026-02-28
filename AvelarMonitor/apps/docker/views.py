from django.shortcuts import render
from apps.core.jwt_auth import jwt_login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .utils import (
    get_containers_list, get_container_logs, container_action,
    get_images_list, get_docker_client
)


@jwt_login_required
def docker_view(request):
    """Página principal de gerenciamento Docker"""
    try:
        containers = get_containers_list()
        context = {
            'containers': containers,
            'docker_available': True,
        }
    except Exception as e:
        context = {
            'containers': [],
            'docker_available': False,
            'error': str(e),
        }
    
    return render(request, 'docker/index.html', context)


@jwt_login_required
def container_detail(request, container_id):
    """Detalhes de um container"""
    try:
        client = get_docker_client()
        container = client.containers.get(container_id)
        
        container_info = {
            'id': container.id[:12],
            'name': container.name,
            'image': container.image.tags[0] if container.image.tags else container.image.id[:12],
            'status': container.status,
            'created': container.attrs['Created'],
            'ports': container.attrs.get('NetworkSettings', {}).get('Ports', {}),
            'env': container.attrs.get('Config', {}).get('Env', []),
            'command': container.attrs.get('Config', {}).get('Cmd', []),
        }
        
        # Health check
        health = container.attrs.get('State', {}).get('Health', {})
        if health:
            container_info['health'] = health.get('Status')
            container_info['health_failing_streak'] = health.get('FailingStreak', 0)
        
        # Logs
        try:
            logs = get_container_logs(container_id, tail=100)
            container_info['logs'] = logs
        except:
            container_info['logs'] = []
        
        context = {
            'container': container_info,
        }
        
        return render(request, 'docker/container_detail.html', context)
    except Exception as e:
        return render(request, 'docker/container_detail.html', {
            'error': str(e)
        })


@jwt_login_required
@require_http_methods(["POST"])
def container_action_view(request, container_id):
    """Executar ação em container"""
    action = request.POST.get('action')
    
    if action not in ['start', 'stop', 'restart', 'pause', 'unpause']:
        return JsonResponse({'error': 'Ação inválida'}, status=400)
    
    try:
        container_action(container_id, action)
        return JsonResponse({'success': True, 'message': f'Container {action} com sucesso'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@jwt_login_required
def container_logs_api(request, container_id):
    """API para retornar logs de container"""
    tail = int(request.GET.get('tail', 100))
    
    try:
        logs = get_container_logs(container_id, tail=tail)
        return JsonResponse({'logs': logs})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@jwt_login_required
def images_view(request):
    """Lista de imagens Docker"""
    try:
        images = get_images_list()
        # Calcular tamanho total
        total_size = sum(img['size'] for img in images)
        total_size_gb = total_size / 1024
        context = {
            'images': images,
            'docker_available': True,
            'total_size': total_size,
            'total_size_gb': total_size_gb,
        }
    except Exception as e:
        context = {
            'images': [],
            'docker_available': False,
            'error': str(e),
            'total_size': 0,
            'total_size_gb': 0,
        }
    
    return render(request, 'docker/images.html', context)

