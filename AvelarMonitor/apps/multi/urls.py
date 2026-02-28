from django.urls import path
from django.contrib.auth.views import LoginView, LogoutView
from . import views

urlpatterns = [
    path('', views.dashboard, name='multi_dashboard'),
    
    path('servers/', views.server_list, name='server_list'),
    path('servers/<str:server_id>/', views.server_detail, name='server_detail'),
    path('servers/<str:server_id>/terminal/', views.server_terminal, name='server_terminal'),
    path('servers/<str:server_id>/metrics/', views.server_metrics, name='server_metrics'),
    
    path('alerts/', views.alert_list, name='alert_list'),
    path('alerts/<int:alert_id>/acknowledge/', views.alert_acknowledge, name='alert_acknowledge'),
    
    path('deployments/', views.deployment_list, name='deployment_list'),
    path('deployments/create/', views.deployment_create, name='deployment_create'),
    
    path('backups/', views.backup_list, name='backup_list'),
    path('backups/create/', views.backup_create, name='backup_create'),
    
    path('tokens/', views.token_list, name='token_list'),
    path('tokens/create/', views.token_create, name='token_create'),
    path('tokens/<int:token_id>/revoke/', views.token_revoke, name='token_revoke'),
    
    path('api/servers/', views.api_servers, name='api_servers'),
    path('api/servers/<str:server_id>/metrics/', views.api_server_metrics, name='api_server_metrics'),
    path('api/servers/<str:server_id>/execute/', views.api_server_execute, name='api_server_execute'),
]
