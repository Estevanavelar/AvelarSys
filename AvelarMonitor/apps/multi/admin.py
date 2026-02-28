from django.contrib import admin
from .models import (
    Server, ServerGroup, AgentToken, Metric, AlertRule, Alert,
    NotificationChannel, Deployment, Backup, CommandHistory
)

@admin.register(ServerGroup)
class ServerGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name', 'description']

@admin.register(Server)
class ServerAdmin(admin.ModelAdmin):
    list_display = ['hostname', 'server_id', 'status', 'last_seen', 'group']
    list_filter = ['status', 'platform', 'group']
    search_fields = ['hostname', 'server_id']
    readonly_fields = ['server_id', 'created_at', 'updated_at']

@admin.register(AgentToken)
class AgentTokenAdmin(admin.ModelAdmin):
    list_display = ['name', 'server', 'is_active', 'last_used', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'token']
    readonly_fields = ['token', 'last_used', 'created_at']

@admin.register(Metric)
class MetricAdmin(admin.ModelAdmin):
    list_display = ['server', 'metric_type', 'value', 'unit', 'created_at']
    list_filter = ['metric_type', 'server']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at']

@admin.register(AlertRule)
class AlertRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'metric_type', 'condition', 'threshold', 'is_active', 'server']
    list_filter = ['condition', 'metric_type', 'is_active']
    search_fields = ['name', 'description']

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['server', 'rule', 'status', 'triggered_at', 'acknowledged_by']
    list_filter = ['status', 'rule']
    date_hierarchy = 'triggered_at'

@admin.register(NotificationChannel)
class NotificationChannelAdmin(admin.ModelAdmin):
    list_display = ['name', 'channel_type', 'is_active']
    list_filter = ['channel_type', 'is_active']
    search_fields = ['name']

@admin.register(Deployment)
class DeploymentAdmin(admin.ModelAdmin):
    list_display = ['name', 'server', 'status', 'branch', 'started_at', 'completed_at']
    list_filter = ['status', 'server']
    date_hierarchy = 'created_at'
    readonly_fields = ['started_at', 'completed_at', 'created_at']

@admin.register(Backup)
class BackupAdmin(admin.ModelAdmin):
    list_display = ['name', 'server', 'backup_type', 'status', 'size', 'started_at', 'completed_at']
    list_filter = ['status', 'backup_type', 'storage_type', 'server']
    date_hierarchy = 'created_at'
    readonly_fields = ['started_at', 'completed_at', 'created_at', 'size']

@admin.register(CommandHistory)
class CommandHistoryAdmin(admin.ModelAdmin):
    list_display = ['server', 'command', 'status', 'exit_code', 'executed_at', 'executed_by']
    list_filter = ['status', 'server']
    date_hierarchy = 'executed_at'
    readonly_fields = ['executed_at']
