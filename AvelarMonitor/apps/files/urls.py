from django.urls import path
from . import views

urlpatterns = [
    path('', views.files_view, name='files'),
    path('<path:path>/', views.files_view, name='files_path'),
    path('file/<path:path>/', views.file_view, name='file_view'),
    path('file/<path:path>/save/', views.file_save, name='file_save'),
    path('file/<path:path>/download/', views.file_download, name='file_download'),
    path('delete/', views.file_delete, name='file_delete'),
    path('upload/', views.file_upload, name='file_upload'),
    path('create/', views.file_create, name='file_create'),
    path('mkdir/', views.directory_create, name='directory_create'),
]

