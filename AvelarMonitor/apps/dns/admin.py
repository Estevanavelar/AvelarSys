from django.contrib import admin
from .models import Domain, DNSRecord, DNSHistory


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ['name', 'provider', 'created_at']
    search_fields = ['name']


@admin.register(DNSRecord)
class DNSRecordAdmin(admin.ModelAdmin):
    list_display = ['type', 'name', 'domain', 'content', 'ttl', 'proxied', 'created_at']
    list_filter = ['type', 'domain', 'proxied']
    search_fields = ['name', 'content']


@admin.register(DNSHistory)
class DNSHistoryAdmin(admin.ModelAdmin):
    list_display = ['record', 'action', 'user', 'created_at']
    list_filter = ['action', 'created_at']
    readonly_fields = ['created_at']

