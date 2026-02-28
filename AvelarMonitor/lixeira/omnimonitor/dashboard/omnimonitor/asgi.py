from django.urls import path
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'omnimonitor.settings')

django_asgi_app = get_asgi_application()

from omnimonitor.consumers import AgentConsumer, DashboardConsumer

websocket_urlpatterns = [
    path('ws/agent/', AgentConsumer.as_asgi()),
    path('ws/dashboard/', DashboardConsumer.as_asgi()),
    path('ws/dashboard/<str:system_id>/', DashboardConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
