from django.urls import path
from . import views

urlpatterns = [
    path('', views.crons_view, name='crons'),
    path('create/', views.task_create, name='task_create'),
    path('<int:task_id>/', views.task_detail, name='task_detail'),
    path('<int:task_id>/edit/', views.task_edit, name='task_edit'),
    path('<int:task_id>/delete/', views.task_delete, name='task_delete'),
    path('<int:task_id>/toggle/', views.task_toggle_active, name='task_toggle_active'),
    path('<int:task_id>/run/', views.task_run_now, name='task_run_now'),
]

