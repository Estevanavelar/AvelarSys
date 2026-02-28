from django.apps import AppConfig


class CronsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.crons'
    verbose_name = 'Trabalhos Agendados'

    def ready(self):
        """Inicia o scheduler quando o app está pronto"""
        try:
            from .scheduler import start_scheduler
            import threading
            
            # Iniciar scheduler em thread separada
            def start():
                import time
                time.sleep(5)  # Aguardar 5 segundos para garantir que tudo está carregado
                start_scheduler()
            
            thread = threading.Thread(target=start, daemon=True)
            thread.start()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erro ao iniciar scheduler automaticamente: {str(e)}")

