from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class ScheduledTask(models.Model):
    """Modelo para trabalhos agendados (Crons)"""
    
    TASK_TYPES = [
        ('restart_frontend', 'Reiniciar Frontend'),
        ('restart_backend', 'Reiniciar Backend'),
        ('restart_container', 'Reiniciar Container'),
        ('backup_database', 'Backup de Banco de Dados'),
        ('cleanup_logs', 'Limpar Logs'),
        ('custom_command', 'Comando Customizado'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('scheduled', 'Agendado'),
        ('running', 'Em Execução'),
        ('completed', 'Concluído'),
        ('failed', 'Falhou'),
        ('cancelled', 'Cancelado'),
    ]
    
    RECURRENCE_CHOICES = [
        ('once', 'Uma vez'),
        ('daily', 'Diariamente'),
        ('weekly', 'Semanalmente'),
        ('monthly', 'Mensalmente'),
        ('custom', 'Personalizado (Cron)'),
    ]
    
    name = models.CharField(max_length=255, verbose_name='Nome do Trabalho')
    task_type = models.CharField(max_length=50, choices=TASK_TYPES, verbose_name='Tipo de Tarefa')
    description = models.TextField(blank=True, null=True, verbose_name='Descrição')
    
    # Agendamento
    scheduled_date = models.DateTimeField(verbose_name='Data/Hora Agendada')
    recurrence = models.CharField(max_length=20, choices=RECURRENCE_CHOICES, default='once', verbose_name='Recorrência')
    cron_expression = models.CharField(max_length=100, blank=True, null=True, verbose_name='Expressão Cron', 
                                      help_text='Ex: 0 2 * * * (diariamente às 2h)')
    
    # Configurações específicas
    container_name = models.CharField(max_length=255, blank=True, null=True, verbose_name='Nome do Container',
                                     help_text='Obrigatório para tarefas de container')
    custom_command = models.TextField(blank=True, null=True, verbose_name='Comando Customizado',
                                     help_text='Comando a ser executado (para tipo Customizado)')
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name='Status')
    is_active = models.BooleanField(default=True, verbose_name='Ativo')
    
    # Execução
    last_run = models.DateTimeField(blank=True, null=True, verbose_name='Última Execução')
    next_run = models.DateTimeField(blank=True, null=True, verbose_name='Próxima Execução')
    run_count = models.IntegerField(default=0, verbose_name='Número de Execuções')
    last_result = models.TextField(blank=True, null=True, verbose_name='Resultado da Última Execução')
    
    # Metadados
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_tasks')
    
    class Meta:
        verbose_name = 'Trabalho Agendado'
        verbose_name_plural = 'Trabalhos Agendados'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.get_task_type_display()})"
    
    def update_next_run(self):
        """Calcula a próxima execução baseado na recorrência"""
        if not self.is_active or self.recurrence == 'once':
            self.next_run = None
            return
        
        from datetime import timedelta
        try:
            from dateutil.relativedelta import relativedelta
        except ImportError:
            # Fallback se dateutil não estiver disponível
            relativedelta = None
        
        if not self.last_run:
            self.next_run = self.scheduled_date
        else:
            if self.recurrence == 'daily':
                self.next_run = self.last_run + timedelta(days=1)
            elif self.recurrence == 'weekly':
                self.next_run = self.last_run + timedelta(weeks=1)
            elif self.recurrence == 'monthly':
                if relativedelta:
                    self.next_run = self.last_run + relativedelta(months=1)
                else:
                    # Fallback simples: adicionar 30 dias
                    self.next_run = self.last_run + timedelta(days=30)
            # Para 'custom', o cron_expression será usado pelo scheduler
        
        self.save()


class TaskExecution(models.Model):
    """Histórico de execuções de tarefas"""
    
    task = models.ForeignKey(ScheduledTask, on_delete=models.CASCADE, related_name='executions')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=ScheduledTask.STATUS_CHOICES, default='running')
    output = models.TextField(blank=True, null=True, verbose_name='Saída')
    error_message = models.TextField(blank=True, null=True, verbose_name='Mensagem de Erro')
    duration_seconds = models.FloatField(blank=True, null=True, verbose_name='Duração (segundos)')
    
    class Meta:
        verbose_name = 'Execução de Tarefa'
        verbose_name_plural = 'Execuções de Tarefas'
        ordering = ['-started_at']
    
    def __str__(self):
        return f"{self.task.name} - {self.started_at}"

