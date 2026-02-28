"""
ASGI config for painel_control project.
"""

import os
from django.urls import path
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'painel_control.settings')

django_asgi_app = get_asgi_application()

from apps.multi.consumers import AgentConsumer, DashboardConsumer

websocket_urlpatterns = [
    path('ws/multi/agent/', AgentConsumer.as_asgi()),
    path('ws/multi/dashboard/', DashboardConsumer.as_asgi()),
    path('ws/multi/dashboard/<str:server_id>/', DashboardConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
