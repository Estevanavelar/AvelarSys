"""Sistema de agendamento de tarefas usando APScheduler"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from django.utils import timezone
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import logging
import pytz

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone=pytz.timezone('America/Sao_Paulo'))


def schedule_task(task):
    """Agenda uma tarefa no scheduler"""
    from .models import ScheduledTask
    from .utils import execute_task
    
    try:
        # Remover job existente se houver
        job_id = f'task_{task.id}'
        try:
            scheduler.remove_job(job_id)
        except:
            pass
        
        if not task.is_active:
            return
        
        # Agendar baseado na recorrência
        if task.recurrence == 'once':
            # Executar uma vez na data agendada
            trigger = DateTrigger(run_date=task.scheduled_date)
            scheduler.add_job(
                execute_task,
                trigger=trigger,
                id=job_id,
                args=[task],
                replace_existing=True
            )
            task.status = 'scheduled'
            task.next_run = task.scheduled_date
            task.save()
            
        elif task.recurrence == 'daily':
            # Executar diariamente no horário agendado
            scheduled_time = task.scheduled_date
            trigger = CronTrigger(
                hour=scheduled_time.hour,
                minute=scheduled_time.minute
            )
            scheduler.add_job(
                execute_task,
                trigger=trigger,
                id=job_id,
                args=[task],
                replace_existing=True
            )
            task.status = 'scheduled'
            task.update_next_run()
            task.save()
            
        elif task.recurrence == 'weekly':
            # Executar semanalmente
            scheduled_time = task.scheduled_date
            trigger = CronTrigger(
                day_of_week=scheduled_time.weekday(),
                hour=scheduled_time.hour,
                minute=scheduled_time.minute
            )
            scheduler.add_job(
                execute_task,
                trigger=trigger,
                id=job_id,
                args=[task],
                replace_existing=True
            )
            task.status = 'scheduled'
            task.update_next_run()
            task.save()
            
        elif task.recurrence == 'monthly':
            # Executar mensalmente
            scheduled_time = task.scheduled_date
            trigger = CronTrigger(
                day=scheduled_time.day,
                hour=scheduled_time.hour,
                minute=scheduled_time.minute
            )
            scheduler.add_job(
                execute_task,
                trigger=trigger,
                id=job_id,
                args=[task],
                replace_existing=True
            )
            task.status = 'scheduled'
            task.update_next_run()
            task.save()
            
        elif task.recurrence == 'custom' and task.cron_expression:
            # Usar expressão cron customizada
            try:
                # Parse da expressão cron: minuto hora dia mês dia-da-semana
                parts = task.cron_expression.split()
                if len(parts) != 5:
                    raise ValueError('Expressão cron inválida')
                
                trigger = CronTrigger(
                    minute=parts[0],
                    hour=parts[1],
                    day=parts[2],
                    month=parts[3],
                    day_of_week=parts[4]
                )
                scheduler.add_job(
                    execute_task,
                    trigger=trigger,
                    id=job_id,
                    args=[task],
                    replace_existing=True
                )
                task.status = 'scheduled'
                task.update_next_run()
                task.save()
            except Exception as e:
                logger.error(f"Erro ao agendar tarefa {task.id} com cron customizado: {str(e)}")
                task.status = 'failed'
                task.save()
        
        logger.info(f"Tarefa {task.name} (ID: {task.id}) agendada com sucesso")
        
    except Exception as e:
        logger.error(f"Erro ao agendar tarefa {task.id}: {str(e)}")
        task.status = 'failed'
        task.save()


def unschedule_task(task):
    """Remove uma tarefa do scheduler"""
    job_id = f'task_{task.id}'
    try:
        scheduler.remove_job(job_id)
        logger.info(f"Tarefa {task.name} (ID: {task.id}) removida do scheduler")
    except:
        pass


def start_scheduler():
    """Inicia o scheduler e agenda todas as tarefas ativas"""
    from .models import ScheduledTask
    
    if scheduler.running:
        logger.warning("Scheduler já está em execução")
        return
    
    try:
        scheduler.start()
        logger.info("Scheduler iniciado")
        
        # Agendar todas as tarefas ativas
        tasks = ScheduledTask.objects.filter(is_active=True)
        for task in tasks:
            schedule_task(task)
        
        logger.info(f"{tasks.count()} tarefas agendadas")
        
    except Exception as e:
        logger.error(f"Erro ao iniciar scheduler: {str(e)}")


def stop_scheduler():
    """Para o scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler parado")


def reload_scheduler():
    """Recarrega todas as tarefas no scheduler"""
    from .models import ScheduledTask
    
    # Remover todos os jobs
    scheduler.remove_all_jobs()
    
    # Agendar todas as tarefas ativas novamente
    tasks = ScheduledTask.objects.filter(is_active=True)
    for task in tasks:
        schedule_task(task)
    
    logger.info(f"Scheduler recarregado com {tasks.count()} tarefas")

