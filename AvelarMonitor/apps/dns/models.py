from django.db import models
from django.contrib.auth.models import User


class Domain(models.Model):
    """Modelo para domínios"""
    name = models.CharField(max_length=255, unique=True, verbose_name='Domínio')
    provider = models.CharField(max_length=50, default='cloudflare', verbose_name='Provedor')
    api_token = models.CharField(max_length=255, blank=True, null=True, verbose_name='API Token')
    zone_id = models.CharField(max_length=255, blank=True, null=True, verbose_name='Zone ID')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Domínio'
        verbose_name_plural = 'Domínios'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class DNSRecord(models.Model):
    """Modelo para registros DNS"""
    RECORD_TYPES = [
        ('A', 'A'),
        ('AAAA', 'AAAA'),
        ('CNAME', 'CNAME'),
        ('MX', 'MX'),
        ('TXT', 'TXT'),
        ('NS', 'NS'),
        ('SRV', 'SRV'),
    ]
    
    domain = models.ForeignKey(Domain, on_delete=models.CASCADE, related_name='records')
    type = models.CharField(max_length=10, choices=RECORD_TYPES, verbose_name='Tipo')
    name = models.CharField(max_length=255, verbose_name='Nome')
    content = models.TextField(verbose_name='Conteúdo')
    ttl = models.IntegerField(default=3600, verbose_name='TTL')
    proxied = models.BooleanField(default=False, verbose_name='Proxied (Cloudflare)')
    cloudflare_id = models.CharField(max_length=255, blank=True, null=True, verbose_name='Cloudflare ID')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Registro DNS'
        verbose_name_plural = 'Registros DNS'
        ordering = ['domain', 'type', 'name']
        unique_together = ['domain', 'type', 'name', 'content']
    
    def __str__(self):
        return f"{self.type} {self.name}.{self.domain.name} -> {self.content}"


class DNSHistory(models.Model):
    """Histórico de alterações DNS"""
    record = models.ForeignKey(DNSRecord, on_delete=models.CASCADE, related_name='history')
    action = models.CharField(max_length=20, choices=[('create', 'Criar'), ('update', 'Atualizar'), ('delete', 'Deletar')])
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    old_value = models.TextField(blank=True, null=True)
    new_value = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Histórico DNS'
        verbose_name_plural = 'Históricos DNS'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.action} - {self.record} - {self.created_at}"

