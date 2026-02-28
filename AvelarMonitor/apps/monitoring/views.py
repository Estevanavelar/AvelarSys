from django.shortcuts import render
from django.http import JsonResponse
from apps.core.jwt_auth import jwt_login_required
from .utils import get_all_metrics, get_cpu_info, get_memory_info, get_disk_info, get_network_info, get_processes_info


@jwt_login_required
def monitoring_view(request):
    return render(request, 'monitoring/index.html')


@jwt_login_required
def metrics_api(request):
    metrics = get_all_metrics()
    return JsonResponse(metrics)


@jwt_login_required
def cpu_view(request):
    cpu_info = get_cpu_info()
    return render(request, 'monitoring/cpu.html', {'cpu_info': cpu_info})


@jwt_login_required
def memory_view(request):
    memory_info = get_memory_info()
    return render(request, 'monitoring/memory.html', {'memory_info': memory_info})


@jwt_login_required
def disk_view(request):
    disk_info = get_disk_info()
    return render(request, 'monitoring/disk.html', {'disk_info': disk_info})


@jwt_login_required
def processes_view(request):
    processes = get_processes_info(limit=50)
    return render(request, 'monitoring/processes.html', {'processes': processes})

