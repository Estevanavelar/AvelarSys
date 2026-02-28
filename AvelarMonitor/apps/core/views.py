from django.shortcuts import render, redirect
from django.views.decorators.http import require_http_methods
from django.conf import settings
import psutil
import docker
from urllib.parse import quote

from .jwt_auth import jwt_login_required, APP_PORTAL_URL


def login_view(request):
    current_url = request.build_absolute_uri()
    login_url = f"{APP_PORTAL_URL}/login?redirect={quote(current_url)}"
    return redirect(login_url)


def logout_view(request):
    if 'jwt_token' in request.session:
        del request.session['jwt_token']
    login_url = f"{APP_PORTAL_URL}/login"
    return redirect(login_url)


@jwt_login_required
def dashboard(request):
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    docker_containers_count = 0
    docker_running_count = 0
    try:
        client = docker.from_env()
        containers = client.containers.list(all=True)
        docker_containers_count = len(containers)
        docker_running_count = len(client.containers.list())
    except:
        pass
    
    context = {
        'cpu_percent': cpu_percent,
        'memory_percent': memory.percent,
        'memory_total': memory.total / (1024**3),
        'memory_used': memory.used / (1024**3),
        'memory_available': memory.available / (1024**3),
        'disk_percent': disk.percent,
        'disk_total': disk.total / (1024**3),
        'disk_used': disk.used / (1024**3),
        'disk_free': disk.free / (1024**3),
        'docker_containers': docker_containers_count,
        'docker_running': docker_running_count,
        'user': request.user,
    }
    
    return render(request, 'core/dashboard.html', context)
