from django.urls import path
from . import views

urlpatterns = [
    path('', views.apikeys_view, name='apikeys'),
    path('create/', views.apikey_create, name='apikey_create'),
    path('<int:pk>/edit/', views.apikey_edit, name='apikey_edit'),
    path('<int:pk>/delete/', views.apikey_delete, name='apikey_delete'),
    path('<int:pk>/toggle/', views.apikey_toggle, name='apikey_toggle'),
    path('<int:pk>/regenerate/', views.apikey_regenerate, name='apikey_regenerate'),
    path('<int:pk>/usage/', views.apikey_usage, name='apikey_usage'),
]

