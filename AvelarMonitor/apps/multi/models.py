from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import secrets


class Server(models.Model):
    """Servidor/VPS monitorado (múltiplos servidores)"""
    
    STATUS_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('warning', 'Warning'),
        ('error', 'Error'),
    ]
    
    server_id = models.CharField(max_length=64, unique=True, verbose_name='Server ID')
    hostname = models.CharField(max_length=255, verbose_name='Hostname')
    platform = models.CharField(max_length=50, verbose_name='Plataforma')
    platform_release = models.CharField(max_length=100, verbose_name='Versão do Sistema')
    architecture = models.CharField(max_length=50, verbose_name='Arquitetura')
    agent_version = models.CharField(max_length=20, verbose_name='Versão do Agent')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='offline', verbose_name='Status')
    last_seen = models.DateTimeField(null=True, blank=True, verbose_name='Última Conexão')
    
    tags = models.JSONField(default=list, blank=True, verbose_name='Tags')
    notes = models.TextField(blank=True, verbose_name='Notas')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    group = models.ForeignKey('ServerGroup', on_delete=models.SET_NULL, null=True, blank=True, related_name='servers')
    
    class Meta:
        verbose_name = 'Servidor'
        verbose_name_plural = 'Servidores'
        ordering = ['-last_seen']
    
    def __str__(self):
        return f"{self.hostname} ({self.server_id[:8]}...)"
    
    def is_online(self):
        return self.status == 'online' and self.last_seen and (timezone.now() - self.last_seen).total_seconds() < 120
    
    def update_status(self):
        """Atualiza o status baseado na última conexão"""
        if not self.last_seen:
            self.status = 'offline'
        elif (timezone.now() - self.last_seen).total_seconds() > 120:
            self.status = 'offline'
        else:
            self.status = 'online'
        self.save()


class ServerGroup(models.Model):
    """Grupo de servidores"""
    
    name = models.CharField(max_length=255, unique=True, verbose_name='Nome')
    description = models.TextField(blank=True, verbose_name='Descrição')
    color = models.CharField(max_length=7, default='#007bff', verbose_name='Cor')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Grupo de Servidores'
        verbose_name_plural = 'Grupos de Servidores'
    
    def __str__(self):
        return self.name


class AgentToken(models.Model):
    """Token para autenticação do agent"""
    
    name = models.CharField(max_length=255, verbose_name='Nome')
    token = models.CharField(max_length=64, unique=True, verbose_name='Token')
    server = models.OneToOneField(Server, on_delete=models.CASCADE, related_name='agent_token', null=True, blank=True)
    
    is_active = models.BooleanField(default=True, verbose_name='Ativo')
    last_used = models.DateTimeField(null=True, blank=True, verbose_name='Último Uso')
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_tokens')
    
    class Meta:
        verbose_name = 'Token de Agent'
        verbose_name_plural = 'Tokens de Agents'
    
    def __str__(self):
        return f"{self.name} ({self.token[:16]}...)"
    
    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(48)
        super().save(*args, **kwargs)
    
    def verify(self, token):
        """Verifica se o token é válido"""
        if not self.is_active:
            return False
        
        is_valid = secrets.compare_digest(self.token, token)
        if is_valid:
            self.last_used = timezone.now()
            self.save()
        
        return is_valid


class Metric(models.Model):
    """Métrica armazenada do servidor"""
    
    server = models.ForeignKey(Server, on_delete=models.CASCADE, related_name='metrics')
    
    metric_type = models.CharField(max_length=50, verbose_name='Tipo de Métrica')
    value = models.FloatField(verbose_name='Valor')
    unit = models.CharField(max_length=20, blank=True, verbose_name='Unidade')
    
    metadata = models.JSONField(default=dict, blank=True, verbose_name='Metadados')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Timestamp')
    
    class Meta:
        verbose_name = 'Métrica'
        verbose_name_plural = 'Métricas'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['server', 'metric_type', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.server.hostname} - {self.metric_type}: {self.value} {self.unit}"


class AlertRule(models.Model):
    """Regra de alerta"""
    
    CONDITION_CHOICES = [
        ('greater_than', 'Maior que'),
        ('less_than', 'Menor que'),
        ('equals', 'Igual a'),
        ('not_equals', 'Diferente de'),
    ]
    
    name = models.CharField(max_length=255, verbose_name='Nome')
    description = models.TextField(blank=True, verbose_name='Descrição')
    
    metric_type = models.CharField(max_length=50, verbose_name='Tipo de Métrica')
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, verbose_name='Condição')
    threshold = models.FloatField(verbose_name='Limite')
    
    duration = models.IntegerField(default=300, verbose_name='Duração (segundos)', help_text='Quanto tempo a condição deve persistir')
    
    server = models.ForeignKey(Server, on_delete=models.CASCADE, related_name='alert_rules', null=True, blank=True)
    
    is_active = models.BooleanField(default=True, verbose_name='Ativo')
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_alert_rules')
    
    class Meta:
        verbose_name = 'Regra de Alerta'
        verbose_name_plural = 'Regras de Alerta'
    
    def __str__(self):
        return f"{self.name} ({self.metric_type} {self.condition} {self.threshold})"


class Alert(models.Model):
    """Alerta disparado"""
    
    STATUS_CHOICES = [
        ('open', 'Aberto'),
        ('acknowledged', 'Reconhecido'),
        ('resolved', 'Resolvido'),
    ]
    
    rule = models.ForeignKey(AlertRule, on_delete=models.CASCADE, related_name='alerts')
    server = models.ForeignKey(Server, on_delete=models.CASCADE, related_name='alerts')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open', verbose_name='Status')
    
    message = models.TextField(verbose_name='Mensagem')
    value = models.FloatField(verbose_name='Valor Atual')
    
    triggered_at = models.DateTimeField(auto_now_add=True, verbose_name='Disparado em')
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name='Resolvido em')
    
    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='acknowledged_alerts')
    
    class Meta:
        verbose_name = 'Alerta'
        verbose_name_plural = 'Alertas'
        ordering = ['-triggered_at']
    
    def __str__(self):
        return f"{self.server.hostname} - {self.message}"


class NotificationChannel(models.Model):
    """Canal de notificação"""
    
    TYPE_CHOICES = [
        ('email', 'Email'),
        ('telegram', 'Telegram'),
        ('slack', 'Slack'),
        ('discord', 'Discord'),
        ('webhook', 'Webhook'),
    ]
    
    name = models.CharField(max_length=255, verbose_name='Nome')
    channel_type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name='Tipo')
    
    config = models.JSONField(verbose_name='Configuração', help_text='Configurações específicas do canal')
    
    is_active = models.BooleanField(default=True, verbose_name='Ativo')
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_notification_channels')
    
    class Meta:
        verbose_name = 'Canal de Notificação'
        verbose_name_plural = 'Canais de Notificação'
    
    def __str__(self):
        return f"{self.name} ({self.get_channel_type_display()})"


class Deployment(models.Model):
    """Deploy de aplicação"""
    
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('deploying', 'Deploying'),
        ('success', 'Sucesso'),
        ('failed', 'Falhou'),
        ('rolling_back', 'Rolling Back'),
        ('rolled_back', 'Rolled Back'),
    ]
    
    server = models.ForeignKey(Server, on_delete=models.CASCADE, related_name='deployments')
    
    name = models.CharField(max_length=255, verbose_name='Nome')
    repository = models.CharField(max_length=500, verbose_name='Repositório Git')
    branch = models.CharField(max_length=100, default='main', verbose_name='Branch')
    commit_hash = models.CharField(max_length=40, blank=True, verbose_name='Commit Hash')
    
    deploy_path = models.CharField(max_length=500, verbose_name='Caminho de Deploy')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name='Status')
    
    log = models.TextField(blank=True, verbose_name='Log')
    error_message = models.TextField(blank=True, verbose_name='Mensagem de Erro')
    
    started_at = models.DateTimeField(null=True, blank=True, verbose_name='Iniciado em')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='Completado em')
    
    rollback_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='rollbacks')
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_deployments')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Deployment'
        verbose_name_plural = 'Deployments'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.server.hostname} ({self.get_status_display()})"
    
    @property
    def duration(self):
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None


class Backup(models.Model):
    """Backup do servidor"""
    
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('running', 'Executando'),
        ('completed', 'Concluído'),
        ('failed', 'Falhou'),
    ]
    
    TYPE_CHOICES = [
        ('database', 'Banco de Dados'),
        ('files', 'Arquivos'),
        ('docker', 'Docker Volumes'),
        ('full', 'Completo'),
    ]
    
    server = models.ForeignKey(Server, on_delete=models.CASCADE, related_name='backups')
    
    name = models.CharField(max_length=255, verbose_name='Nome')
    backup_type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name='Tipo')
    
    source_path = models.CharField(max_length=500, blank=True, verbose_name='Caminho de Origem')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name='Status')
    
    size = models.BigIntegerField(null=True, blank=True, verbose_name='Tamanho (bytes)')
    
    storage_path = models.CharField(max_length=500, blank=True, verbose_name='Caminho de Armazenamento')
    storage_type = models.CharField(max_length=50, default='local', verbose_name='Tipo de Armazenamento')
    
    log = models.TextField(blank=True, verbose_name='Log')
    error_message = models.TextField(blank=True, verbose_name='Mensagem de Erro')
    
    started_at = models.DateTimeField(null=True, blank=True, verbose_name='Iniciado em')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='Completado em')
    
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name='Expira em')
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_backups')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Backup'
        verbose_name_plural = 'Backups'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.server.hostname} ({self.get_status_display()})"


class CommandHistory(models.Model):
    """Histórico de comandos executados"""
    
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('running', 'Executando'),
        ('success', 'Sucesso'),
        ('failed', 'Falhou'),
        ('timeout', 'Timeout'),
    ]
    
    server = models.ForeignKey(Server, on_delete=models.CASCADE, related_name='command_history')
    
    command = models.TextField(verbose_name='Comando')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name='Status')
    
    output = models.TextField(blank=True, verbose_name='Saída')
    error = models.TextField(blank=True, verbose_name='Erro')
    exit_code = models.IntegerField(null=True, blank=True, verbose_name='Exit Code')
    
    duration = models.FloatField(null=True, blank=True, verbose_name='Duração (segundos)')
    
    executed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='executed_commands')
    executed_at = models.DateTimeField(auto_now_add=True, verbose_name='Executado em')
    
    class Meta:
        verbose_name = 'Histórico de Comando'
        verbose_name_plural = 'Histórico de Comandos'
        ordering = ['-executed_at']
    
    def __str__(self):
        return f"{self.server.hostname} - {self.command[:50]}..."
