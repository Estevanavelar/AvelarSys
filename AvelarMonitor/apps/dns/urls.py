from django.urls import path
from . import views

urlpatterns = [
    path('', views.dns_view, name='dns'),
    path('domain/', views.dns_view, name='domain_list'),  # Redireciona para página principal
    path('domain/create/', views.domain_create, name='domain_create'),
    path('domain/<int:pk>/edit/', views.domain_edit, name='domain_edit'),
    path('domain/<int:pk>/delete/', views.domain_delete, name='domain_delete'),
    path('domain/<int:pk>/sync/', views.domain_sync, name='domain_sync'),
    path('record/create/', views.record_create, name='record_create'),
    path('record/<int:pk>/edit/', views.record_edit, name='record_edit'),
    path('record/<int:pk>/delete/', views.record_delete, name='record_delete'),
    path('record/<int:pk>/check/', views.check_propagation, name='check_propagation'),
]

