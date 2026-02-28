from django.shortcuts import render, redirect, get_object_or_404
from apps.core.jwt_auth import jwt_login_required
from django.http import JsonResponse
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
import json

from .models import (
    Server, ServerGroup, AgentToken, Metric, AlertRule, Alert,
    NotificationChannel, Deployment, Backup, CommandHistory
)

@jwt_login_required
def dashboard(request):
    servers = Server.objects.all()
    
    online_servers = sum(1 for s in servers if s.is_online())
    total_servers = servers.count()
    
    recent_alerts = Alert.objects.filter(status='open').order_by('-triggered_at')[:10]
    
    recent_deployments = Deployment.objects.all().order_by('-created_at')[:5]
    
    context = {
        'servers': servers,
        'online_servers': online_servers,
        'total_servers': total_servers,
        'recent_alerts': recent_alerts,
        'recent_deployments': recent_deployments,
    }
    return render(request, 'multi/dashboard.html', context)

@jwt_login_required
def server_list(request):
    servers = Server.objects.all()
    groups = ServerGroup.objects.all()
    
    group_filter = request.GET.get('group')
    if group_filter:
        servers = servers.filter(group_id=group_filter)
    
    context = {
        'servers': servers,
        'groups': groups,
    }
    return render(request, 'multi/servers/list.html', context)

@jwt_login_required
def server_detail(request, server_id):
    server = get_object_or_404(Server, server_id=server_id)
    
    recent_metrics = Metric.objects.filter(server=server).order_by('-created_at')[:100]
    
    recent_commands = CommandHistory.objects.filter(server=server).order_by('-executed_at')[:20]
    
    context = {
        'server': server,
        'recent_metrics': recent_metrics,
        'recent_commands': recent_commands,
    }
    return render(request, 'multi/servers/detail.html', context)

@jwt_login_required
def server_terminal(request, server_id):
    server = get_object_or_404(Server, server_id=server_id)
    
    context = {
        'server': server,
    }
    return render(request, 'multi/servers/terminal.html', context)

@jwt_login_required
def server_metrics(request, server_id):
    server = get_object_or_404(Server, server_id=server_id)
    
    metric_type = request.GET.get('type', 'cpu_percent')
    hours = int(request.GET.get('hours', 24))
    
    since = timezone.now() - timedelta(hours=hours)
    
    metrics = Metric.objects.filter(
        server=server,
        metric_type=metric_type,
        created_at__gte=since
    ).order_by('created_at')
    
    data = [{
        'timestamp': m.created_at.isoformat(),
        'value': m.value,
    } for m in metrics]
    
    return JsonResponse({'data': data})

@jwt_login_required
def alert_list(request):
    alerts = Alert.objects.all()
    
    status_filter = request.GET.get('status')
    if status_filter:
        alerts = alerts.filter(status=status_filter)
    
    context = {
        'alerts': alerts,
    }
    return render(request, 'multi/alerts/list.html', context)

@jwt_login_required
def alert_acknowledge(request, alert_id):
    alert = get_object_or_404(Alert, pk=alert_id)
    
    if alert.status == 'open':
        alert.status = 'acknowledged'
        alert.acknowledged_by = request.user
        alert.save()
    
    return redirect('alert_list')

@jwt_login_required
def deployment_list(request):
    deployments = Deployment.objects.all()
    
    status_filter = request.GET.get('status')
    if status_filter:
        deployments = deployments.filter(status=status_filter)
    
    context = {
        'deployments': deployments,
    }
    return render(request, 'multi/deployments/list.html', context)

@jwt_login_required
def deployment_create(request):
    if request.method == 'POST':
        server_id = request.POST.get('server')
        repository = request.POST.get('repository')
        branch = request.POST.get('branch')
        deploy_path = request.POST.get('deploy_path')
        name = request.POST.get('name')
        
        server = get_object_or_404(Server, server_id=server_id)
        
        deployment = Deployment.objects.create(
            server=server,
            name=name,
            repository=repository,
            branch=branch,
            deploy_path=deploy_path,
            status='pending',
            created_by=request.user
        )
        
        return redirect('server_detail', server_id=server.server_id)
    
    servers = Server.objects.all()
    
    context = {
        'servers': servers,
    }
    return render(request, 'multi/deployments/create.html', context)

@jwt_login_required
def backup_list(request):
    backups = Backup.objects.all()
    
    status_filter = request.GET.get('status')
    if status_filter:
        backups = backups.filter(status=status_filter)
    
    context = {
        'backups': backups,
    }
    return render(request, 'multi/backups/list.html', context)

@jwt_login_required
def backup_create(request):
    if request.method == 'POST':
        server_id = request.POST.get('server')
        backup_type = request.POST.get('backup_type')
        source_path = request.POST.get('source_path', '')
        name = request.POST.get('name')
        
        server = get_object_or_404(Server, server_id=server_id)
        
        backup = Backup.objects.create(
            server=server,
            name=name,
            backup_type=backup_type,
            source_path=source_path,
            status='pending',
            created_by=request.user
        )
        
        return redirect('backup_list')
    
    servers = Server.objects.all()
    
    context = {
        'servers': servers,
    }
    return render(request, 'multi/backups/create.html', context)

@jwt_login_required
def token_list(request):
    tokens = AgentToken.objects.all()
    
    context = {
        'tokens': tokens,
    }
    return render(request, 'multi/tokens/list.html', context)

@jwt_login_required
def token_create(request):
    if request.method == 'POST':
        name = request.POST.get('name')
        
        token = AgentToken.objects.create(
            name=name,
            created_by=request.user
        )
        
        return redirect('token_list')
    
    return render(request, 'multi/tokens/create.html')

@jwt_login_required
def token_revoke(request, token_id):
    token = get_object_or_404(AgentToken, pk=token_id)
    
    token.is_active = False
    token.save()
    
    return redirect('token_list')

@jwt_login_required
def api_servers(request):
    servers = Server.objects.all()
    
    data = [{
        'id': s.server_id,
        'hostname': s.hostname,
        'status': s.status,
        'is_online': s.is_online(),
        'last_seen': s.last_seen.isoformat() if s.last_seen else None,
        'platform': s.platform,
        'group': s.group.name if s.group else None,
    } for s in servers]
    
    return JsonResponse({'servers': data})

@jwt_login_required
def api_server_metrics(request, server_id):
    server = get_object_or_404(Server, server_id=server_id)
    
    metrics_data = {}
    
    for metric_type in ['cpu_percent', 'memory_percent', 'disk_percent', 'network_bytes_sent', 'network_bytes_recv']:
        since = timezone.now() - timedelta(hours=1)
        metrics = Metric.objects.filter(
            server=server,
            metric_type=metric_type,
            created_at__gte=since
        ).order_by('created_at')
        
        metrics_data[metric_type] = [{
            'timestamp': m.created_at.isoformat(),
            'value': m.value,
        } for m in metrics]
    
    return JsonResponse({'metrics': metrics_data})

@jwt_login_required
def api_server_execute(request, server_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    
    server = get_object_or_404(Server, server_id=server_id)
    
    try:
        data = json.loads(request.body)
        command = data.get('command')
        
        if not command:
            return JsonResponse({'error': 'Command required'}, status=400)
        
        command_history = CommandHistory.objects.create(
            server=server,
            command=command,
            status='pending',
            executed_by=request.user
        )
        
        return JsonResponse({
            'command_id': command_history.id,
            'status': 'pending'
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
