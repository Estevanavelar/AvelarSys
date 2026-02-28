"""
Configuração do Celery para o AvelarMonitor.
"""
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'painel_control.settings')

app = Celery('painel_control')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
    """Task de debug."""
    print(f'Request: {self.request!r}')
