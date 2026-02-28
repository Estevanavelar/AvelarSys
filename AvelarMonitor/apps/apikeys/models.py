from django.db import models
from django.contrib.auth.models import User
import secrets
import hashlib


class APIKey(models.Model):
    """Modelo para API Keys"""
    SERVICES = [
        ('cloudflare', 'Cloudflare'),
        ('stripe', 'Stripe'),
        ('whatsapp', 'WhatsApp'),
        ('google_maps', 'Google Maps'),
        ('mercadopago', 'Mercado Pago'),
        ('other', 'Outro'),
    ]
    
    name = models.CharField(max_length=255, verbose_name='Nome')
    service = models.CharField(max_length=50, choices=SERVICES, verbose_name='Serviço')
    key_hash = models.CharField(max_length=255, verbose_name='Hash da Key')
    key_last4 = models.CharField(max_length=4, verbose_name='Últimos 4 caracteres')
    active = models.BooleanField(default=True, verbose_name='Ativo')
    scopes = models.TextField(blank=True, null=True, verbose_name='Escopos/Permissões')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_keys')
    
    class Meta:
        verbose_name = 'API Key'
        verbose_name_plural = 'API Keys'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.service})"
    
    @staticmethod
    def generate_key(length=32):
        """Gera uma nova API key"""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def hash_key(key):
        """Gera hash de uma key"""
        return hashlib.sha256(key.encode()).hexdigest()
    
    def set_key(self, key):
        """Define a key e armazena o hash"""
        self.key_hash = self.hash_key(key)
        self.key_last4 = key[-4:] if len(key) >= 4 else key
    
    def verify_key(self, key):
        """Verifica se a key corresponde ao hash"""
        return self.key_hash == self.hash_key(key)


class APIKeyUsage(models.Model):
    """Histórico de uso de API Keys"""
    key = models.ForeignKey(APIKey, on_delete=models.CASCADE, related_name='usage_history')
    endpoint = models.CharField(max_length=255, verbose_name='Endpoint')
    ip_address = models.GenericIPAddressField(verbose_name='IP Address')
    user_agent = models.TextField(blank=True, null=True, verbose_name='User Agent')
    success = models.BooleanField(default=True, verbose_name='Sucesso')
    error_message = models.TextField(blank=True, null=True, verbose_name='Mensagem de Erro')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Uso de API Key'
        verbose_name_plural = 'Usos de API Keys'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.key.name} - {self.endpoint} - {self.created_at}"

