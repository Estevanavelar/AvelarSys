from django.urls import path
from django.contrib.auth.views import LoginView, LogoutView
from . import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('login/', LoginView.as_view(template_name='login.html'), name='login'),
    path('logout/', LogoutView.as_view(next_page='login'), name='logout'),
    
    path('systems/', views.system_list, name='system_list'),
    path('systems/<str:system_id>/', views.system_detail, name='system_detail'),
    path('systems/<str:system_id>/terminal/', views.system_terminal, name='system_terminal'),
    path('systems/<str:system_id>/metrics/', views.system_metrics, name='system_metrics'),
    path('systems/<str:system_id>/docker/', views.system_docker, name='system_docker'),
    
    path('alerts/', views.alert_list, name='alert_list'),
    path('alerts/<int:alert_id>/acknowledge/', views.alert_acknowledge, name='alert_acknowledge'),
    
    path('deployments/', views.deployment_list, name='deployment_list'),
    path('deployments/create/', views.deployment_create, name='deployment_create'),
    path('deployments/<int:deployment_id>/rollback/', views.deployment_rollback, name='deployment_rollback'),
    
    path('backups/', views.backup_list, name='backup_list'),
    path('backups/create/', views.backup_create, name='backup_create'),
    
    path('tokens/', views.token_list, name='token_list'),
    path('tokens/create/', views.token_create, name='token_create'),
    path('tokens/<int:token_id>/revoke/', views.token_revoke, name='token_revoke'),
    
    path('api/systems/', views.api_systems, name='api_systems'),
    path('api/systems/<str:system_id>/metrics/', views.api_system_metrics, name='api_system_metrics'),
    path('api/systems/<str:system_id>/execute/', views.api_system_execute, name='api_system_execute'),
]
