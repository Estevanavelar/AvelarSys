from django.contrib import admin
from .models import APIKey, APIKeyUsage


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display = ['name', 'service', 'key_last4', 'active', 'created_by', 'created_at']
    list_filter = ['service', 'active', 'created_at']
    search_fields = ['name']
    readonly_fields = ['key_hash', 'key_last4', 'created_at', 'updated_at']


@admin.register(APIKeyUsage)
class APIKeyUsageAdmin(admin.ModelAdmin):
    list_display = ['key', 'endpoint', 'ip_address', 'success', 'created_at']
    list_filter = ['success', 'created_at']
    readonly_fields = ['created_at']

