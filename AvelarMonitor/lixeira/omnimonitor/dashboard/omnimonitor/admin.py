from django.contrib import admin
from .models import (
    System, SystemGroup, AgentToken, Metric, AlertRule, Alert,
    NotificationChannel, Deployment, Backup, CommandHistory
)

@admin.register(SystemGroup)
class SystemGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name', 'description']

@admin.register(System)
class SystemAdmin(admin.ModelAdmin):
    list_display = ['hostname', 'system_id', 'status', 'last_seen', 'group']
    list_filter = ['status', 'platform', 'group']
    search_fields = ['hostname', 'system_id']
    readonly_fields = ['system_id', 'created_at', 'updated_at']

@admin.register(AgentToken)
class AgentTokenAdmin(admin.ModelAdmin):
    list_display = ['name', 'system', 'is_active', 'last_used', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'token']
    readonly_fields = ['token', 'last_used', 'created_at']

@admin.register(Metric)
class MetricAdmin(admin.ModelAdmin):
    list_display = ['system', 'metric_type', 'value', 'unit', 'created_at']
    list_filter = ['metric_type', 'system']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at']

@admin.register(AlertRule)
class AlertRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'metric_type', 'condition', 'threshold', 'is_active', 'system']
    list_filter = ['condition', 'metric_type', 'is_active']
    search_fields = ['name', 'description']

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['system', 'rule', 'status', 'triggered_at', 'acknowledged_by']
    list_filter = ['status', 'rule']
    date_hierarchy = 'triggered_at'

@admin.register(NotificationChannel)
class NotificationChannelAdmin(admin.ModelAdmin):
    list_display = ['name', 'channel_type', 'is_active']
    list_filter = ['channel_type', 'is_active']
    search_fields = ['name']

@admin.register(Deployment)
class DeploymentAdmin(admin.ModelAdmin):
    list_display = ['name', 'system', 'status', 'branch', 'started_at', 'completed_at']
    list_filter = ['status', 'system']
    date_hierarchy = 'created_at'
    readonly_fields = ['started_at', 'completed_at', 'created_at']

@admin.register(Backup)
class BackupAdmin(admin.ModelAdmin):
    list_display = ['name', 'system', 'backup_type', 'status', 'size', 'started_at', 'completed_at']
    list_filter = ['status', 'backup_type', 'storage_type', 'system']
    date_hierarchy = 'created_at'
    readonly_fields = ['started_at', 'completed_at', 'created_at', 'size']

@admin.register(CommandHistory)
class CommandHistoryAdmin(admin.ModelAdmin):
    list_display = ['system', 'command', 'status', 'exit_code', 'executed_at', 'executed_by']
    list_filter = ['status', 'system']
    date_hierarchy = 'executed_at'
    readonly_fields = ['executed_at']
