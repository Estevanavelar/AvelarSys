from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
import json

from .models import (
    System, SystemGroup, AgentToken, Metric, AlertRule, Alert,
    NotificationChannel, Deployment, Backup, CommandHistory
)

@login_required
def dashboard(request):
    systems = System.objects.all()
    
    online_systems = sum(1 for s in systems if s.is_online())
    total_systems = systems.count()
    
    recent_alerts = Alert.objects.filter(status='open').order_by('-triggered_at')[:10]
    
    recent_deployments = Deployment.objects.all().order_by('-created_at')[:5]
    
    context = {
        'systems': systems,
        'online_systems': online_systems,
        'total_systems': total_systems,
        'recent_alerts': recent_alerts,
        'recent_deployments': recent_deployments,
    }
    return render(request, 'dashboard.html', context)

@login_required
def system_list(request):
    systems = System.objects.all()
    groups = SystemGroup.objects.all()
    
    group_filter = request.GET.get('group')
    if group_filter:
        systems = systems.filter(group_id=group_filter)
    
    context = {
        'systems': systems,
        'groups': groups,
    }
    return render(request, 'systems/list.html', context)

@login_required
def system_detail(request, system_id):
    system = get_object_or_404(System, system_id=system_id)
    
    recent_metrics = Metric.objects.filter(system=system).order_by('-created_at')[:100]
    
    recent_commands = CommandHistory.objects.filter(system=system).order_by('-executed_at')[:20]
    
    context = {
        'system': system,
        'recent_metrics': recent_metrics,
        'recent_commands': recent_commands,
    }
    return render(request, 'systems/detail.html', context)

@login_required
def system_terminal(request, system_id):
    system = get_object_or_404(System, system_id=system_id)
    
    context = {
        'system': system,
    }
    return render(request, 'systems/terminal.html', context)

@login_required
def system_metrics(request, system_id):
    system = get_object_or_404(System, system_id=system_id)
    
    metric_type = request.GET.get('type', 'cpu_percent')
    hours = int(request.GET.get('hours', 24))
    
    since = timezone.now() - timedelta(hours=hours)
    
    metrics = Metric.objects.filter(
        system=system,
        metric_type=metric_type,
        created_at__gte=since
    ).order_by('created_at')
    
    data = [{
        'timestamp': m.created_at.isoformat(),
        'value': m.value,
    } for m in metrics]
    
    return JsonResponse({'data': data})

@login_required
def system_docker(request, system_id):
    system = get_object_or_404(System, system_id=system_id)
    
    context = {
        'system': system,
    }
    return render(request, 'systems/docker.html', context)

@login_required
def alert_list(request):
    alerts = Alert.objects.all()
    
    status_filter = request.GET.get('status')
    if status_filter:
        alerts = alerts.filter(status=status_filter)
    
    context = {
        'alerts': alerts,
    }
    return render(request, 'alerts/list.html', context)

@login_required
def alert_acknowledge(request, alert_id):
    alert = get_object_or_404(Alert, pk=alert_id)
    
    if alert.status == 'open':
        alert.status = 'acknowledged'
        alert.acknowledged_by = request.user
        alert.save()
    
    return redirect('alert_list')

@login_required
def deployment_list(request):
    deployments = Deployment.objects.all()
    
    status_filter = request.GET.get('status')
    if status_filter:
        deployments = deployments.filter(status=status_filter)
    
    context = {
        'deployments': deployments,
    }
    return render(request, 'deployments/list.html', context)

@login_required
def deployment_create(request):
    if request.method == 'POST':
        system_id = request.POST.get('system')
        repository = request.POST.get('repository')
        branch = request.POST.get('branch')
        deploy_path = request.POST.get('deploy_path')
        name = request.POST.get('name')
        
        system = get_object_or_404(System, system_id=system_id)
        
        deployment = Deployment.objects.create(
            system=system,
            name=name,
            repository=repository,
            branch=branch,
            deploy_path=deploy_path,
            status='pending',
            created_by=request.user
        )
        
        return redirect('deployment_detail', deployment_id=deployment.id)
    
    systems = System.objects.all()
    
    context = {
        'systems': systems,
    }
    return render(request, 'deployments/create.html', context)

@login_required
def deployment_rollback(request, deployment_id):
    deployment = get_object_or_404(Deployment, pk=deployment_id)
    
    if deployment.status == 'success':
        new_deployment = Deployment.objects.create(
            system=deployment.system,
            name=f"{deployment.name} (Rollback)",
            repository=deployment.repository,
            branch=deployment.branch,
            commit_hash=deployment.commit_hash,
            deploy_path=deployment.deploy_path,
            status='pending',
            rollback_from=deployment,
            created_by=request.user
        )
    
    return redirect('deployment_detail', deployment_id=new_deployment.id)

@login_required
def backup_list(request):
    backups = Backup.objects.all()
    
    status_filter = request.GET.get('status')
    if status_filter:
        backups = backups.filter(status=status_filter)
    
    context = {
        'backups': backups,
    }
    return render(request, 'backups/list.html', context)

@login_required
def backup_create(request):
    if request.method == 'POST':
        system_id = request.POST.get('system')
        backup_type = request.POST.get('backup_type')
        source_path = request.POST.get('source_path', '')
        name = request.POST.get('name')
        
        system = get_object_or_404(System, system_id=system_id)
        
        backup = Backup.objects.create(
            system=system,
            name=name,
            backup_type=backup_type,
            source_path=source_path,
            status='pending',
            created_by=request.user
        )
        
        return redirect('backup_detail', backup_id=backup.id)
    
    systems = System.objects.all()
    
    context = {
        'systems': systems,
    }
    return render(request, 'backups/create.html', context)

@login_required
def token_list(request):
    tokens = AgentToken.objects.all()
    
    context = {
        'tokens': tokens,
    }
    return render(request, 'tokens/list.html', context)

@login_required
def token_create(request):
    if request.method == 'POST':
        name = request.POST.get('name')
        
        token = AgentToken.objects.create(
            name=name,
            created_by=request.user
        )
        
        return redirect('token_list')
    
    return render(request, 'tokens/create.html')

@login_required
def token_revoke(request, token_id):
    token = get_object_or_404(AgentToken, pk=token_id)
    
    token.is_active = False
    token.save()
    
    return redirect('token_list')

@login_required
def api_systems(request):
    systems = System.objects.all()
    
    data = [{
        'id': s.system_id,
        'hostname': s.hostname,
        'status': s.status,
        'is_online': s.is_online(),
        'last_seen': s.last_seen.isoformat() if s.last_seen else None,
        'platform': s.platform,
        'group': s.group.name if s.group else None,
    } for s in systems]
    
    return JsonResponse({'systems': data})

@login_required
def api_system_metrics(request, system_id):
    system = get_object_or_404(System, system_id=system_id)
    
    metrics_data = {}
    
    for metric_type in ['cpu_percent', 'memory_percent', 'disk_percent', 'network_bytes_sent', 'network_bytes_recv']:
        since = timezone.now() - timedelta(hours=1)
        metrics = Metric.objects.filter(
            system=system,
            metric_type=metric_type,
            created_at__gte=since
        ).order_by('created_at')
        
        metrics_data[metric_type] = [{
            'timestamp': m.created_at.isoformat(),
            'value': m.value,
        } for m in metrics]
    
    return JsonResponse({'metrics': metrics_data})

@login_required
def api_system_execute(request, system_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    
    system = get_object_or_404(System, system_id=system_id)
    
    try:
        data = json.loads(request.body)
        command = data.get('command')
        
        if not command:
            return JsonResponse({'error': 'Command required'}, status=400)
        
        command_history = CommandHistory.objects.create(
            system=system,
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
