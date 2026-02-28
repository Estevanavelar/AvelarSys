from django.urls import path
from . import views

urlpatterns = [
    path('', views.monitoring_view, name='monitoring'),
    path('api/metrics/', views.metrics_api, name='metrics_api'),
    path('cpu/', views.cpu_view, name='monitoring_cpu'),
    path('memory/', views.memory_view, name='monitoring_memory'),
    path('disk/', views.disk_view, name='monitoring_disk'),
    path('processes/', views.processes_view, name='monitoring_processes'),
]

