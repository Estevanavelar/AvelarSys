"""Comando Django para iniciar o scheduler de tarefas"""
from django.core.management.base import BaseCommand
from apps.crons.scheduler import start_scheduler
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Inicia o scheduler de tarefas agendadas'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Iniciando scheduler de tarefas...'))
        try:
            start_scheduler()
            self.stdout.write(self.style.SUCCESS('Scheduler iniciado com sucesso!'))
            # Manter o processo rodando
            import time
            while True:
                time.sleep(60)  # Verificar a cada minuto
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('Scheduler interrompido pelo usuário'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Erro ao iniciar scheduler: {str(e)}'))

