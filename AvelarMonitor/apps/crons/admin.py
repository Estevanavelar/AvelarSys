from django.contrib import admin
from .models import ScheduledTask, TaskExecution


@admin.register(ScheduledTask)
class ScheduledTaskAdmin(admin.ModelAdmin):
    list_display = ['name', 'task_type', 'status', 'is_active', 'next_run', 'run_count', 'created_at']
    list_filter = ['task_type', 'status', 'is_active', 'recurrence']
    search_fields = ['name', 'description']
    readonly_fields = ['last_run', 'next_run', 'run_count', 'last_result', 'created_at', 'updated_at', 'created_by']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('name', 'task_type', 'description', 'created_by')
        }),
        ('Agendamento', {
            'fields': ('scheduled_date', 'recurrence', 'cron_expression')
        }),
        ('Configurações', {
            'fields': ('container_name', 'custom_command')
        }),
        ('Status', {
            'fields': ('status', 'is_active')
        }),
        ('Execução', {
            'fields': ('last_run', 'next_run', 'run_count', 'last_result')
        }),
        ('Metadados', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TaskExecution)
class TaskExecutionAdmin(admin.ModelAdmin):
    list_display = ['task', 'started_at', 'status', 'duration_seconds']
    list_filter = ['status', 'started_at']
    search_fields = ['task__name']
    readonly_fields = ['task', 'started_at', 'completed_at', 'status', 'output', 'error_message', 'duration_seconds']

