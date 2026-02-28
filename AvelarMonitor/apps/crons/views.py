from django.shortcuts import render, redirect, get_object_or_404
from apps.core.jwt_auth import jwt_login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from .models import ScheduledTask, TaskExecution
from .forms import ScheduledTaskForm
from .utils import execute_task
from .scheduler import schedule_task, unschedule_task


@jwt_login_required
def crons_view(request):
    """Página principal de gerenciamento de Crons"""
    tasks = ScheduledTask.objects.all()
    
    # Estatísticas
    stats = {
        'total': tasks.count(),
        'active': tasks.filter(is_active=True).count(),
        'pending': tasks.filter(status='pending').count(),
        'scheduled': tasks.filter(status='scheduled').count(),
        'completed': tasks.filter(status='completed').count(),
        'failed': tasks.filter(status='failed').count(),
    }
    
    context = {
        'tasks': tasks,
        'stats': stats,
    }
    
    return render(request, 'crons/index.html', context)


@jwt_login_required
def task_create(request):
    """Criar novo trabalho agendado"""
    if request.method == 'POST':
        form = ScheduledTaskForm(request.POST)
        if form.is_valid():
            task = form.save(commit=False)
            task.created_by = request.user
            task.status = 'scheduled'
            task.update_next_run()
            task.save()
            # Agendar a tarefa
            if task.is_active:
                schedule_task(task)
            messages.success(request, f'Trabalho "{task.name}" criado com sucesso!')
            return redirect('crons')
    else:
        form = ScheduledTaskForm()
    
    context = {
        'form': form,
        'title': 'Criar Trabalho Agendado',
    }
    
    return render(request, 'crons/form.html', context)


@jwt_login_required
def task_edit(request, task_id):
    """Editar trabalho agendado"""
    task = get_object_or_404(ScheduledTask, id=task_id)
    
    if request.method == 'POST':
        form = ScheduledTaskForm(request.POST, instance=task)
        if form.is_valid():
            task = form.save()
            task.update_next_run()
            # Reagendar a tarefa
            if task.is_active:
                schedule_task(task)
            else:
                unschedule_task(task)
            messages.success(request, f'Trabalho "{task.name}" atualizado com sucesso!')
            return redirect('crons')
    else:
        form = ScheduledTaskForm(instance=task)
    
    context = {
        'form': form,
        'task': task,
        'title': f'Editar: {task.name}',
    }
    
    return render(request, 'crons/form.html', context)


@jwt_login_required
def task_delete(request, task_id):
    """Deletar trabalho agendado"""
    task = get_object_or_404(ScheduledTask, id=task_id)
    
    if request.method == 'POST':
        task_name = task.name
        # Remover do scheduler antes de deletar
        unschedule_task(task)
        task.delete()
        messages.success(request, f'Trabalho "{task_name}" deletado com sucesso!')
        return redirect('crons')
    
    context = {
        'task': task,
    }
    
    return render(request, 'crons/delete_confirm.html', context)


@jwt_login_required
def task_detail(request, task_id):
    """Detalhes de um trabalho agendado"""
    task = get_object_or_404(ScheduledTask, id=task_id)
    executions = task.executions.all()[:20]  # Últimas 20 execuções
    
    context = {
        'task': task,
        'executions': executions,
    }
    
    return render(request, 'crons/detail.html', context)


@jwt_login_required
@require_http_methods(["POST"])
def task_toggle_active(request, task_id):
    """Ativar/desativar trabalho"""
    task = get_object_or_404(ScheduledTask, id=task_id)
    task.is_active = not task.is_active
    task.update_next_run()
    task.save()
    
    # Agendar ou remover do scheduler
    if task.is_active:
        schedule_task(task)
    else:
        unschedule_task(task)
    
    status = 'ativado' if task.is_active else 'desativado'
    messages.success(request, f'Trabalho "{task.name}" {status}!')
    
    return redirect('crons')


@jwt_login_required
@require_http_methods(["POST"])
def task_run_now(request, task_id):
    """Executar tarefa imediatamente"""
    task = get_object_or_404(ScheduledTask, id=task_id)
    
    try:
        result = execute_task(task)
        
        if result['success']:
            messages.success(request, f'Tarefa "{task.name}" executada com sucesso!')
        else:
            messages.error(request, f'Erro ao executar tarefa: {result.get("message", "Erro desconhecido")}')
    except Exception as e:
        messages.error(request, f'Erro ao executar tarefa: {str(e)}')
    
    return redirect('task_detail', task_id=task_id)

