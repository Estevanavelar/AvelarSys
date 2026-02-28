"""
URL configuration for painel_control project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('apps.core.urls')),
    path('multi/', include('apps.multi.urls')),
    path('monitoring/', include('apps.monitoring.urls')),
    path('files/', include('apps.files.urls')),
    path('docker/', include('apps.docker.urls')),
    path('dns/', include('apps.dns.urls')),
    path('apikeys/', include('apps.apikeys.urls')),
    path('crons/', include('apps.crons.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

