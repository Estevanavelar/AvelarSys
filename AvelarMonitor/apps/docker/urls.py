from django.urls import path
from . import views

urlpatterns = [
    path('', views.docker_view, name='docker'),
    path('container/<str:container_id>/', views.container_detail, name='container_detail'),
    path('container/<str:container_id>/action/', views.container_action_view, name='container_action'),
    path('container/<str:container_id>/logs/', views.container_logs_api, name='container_logs'),
    path('images/', views.images_view, name='docker_images'),
]

