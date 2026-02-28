# Integração OmniMonitor no AvelarMonitor

## O que foi feito

O conteúdo do **OmniMonitor** foi integrado dentro do **AvelarMonitor** existente, criando um sistema unificado de monitoramento local e remoto.

## Arquitetura

```
AvelarMonitor (Painel Local + Painel Central)
    │
    ├── Apps Locais (Single VPS)
    │   ├── core          - Dashboard e autenticação
    │   ├── monitoring    - Monitoramento local de recursos
    │   ├── files         - Gerenciador de arquivos local
    │   ├── docker        - Gerenciamento Docker local
    │   ├── dns           - Gerenciamento DNS local
    │   ├── apikeys       - API keys do sistema
    │   └── crons         - Agendamento de tarefas
    │
    ├── App Multi-Servidor (Múltiplas VPS)
    │   ├── models.py     - Server, Metric, Alert, Deployment, Backup
    │   ├── consumers.py  - WebSocket (AgentConsumer, DashboardConsumer)
    │   ├── views.py      - Views para multi-servidor
    │   ├── urls.py       - Rotas /multi/*
    │   └── admin.py      - Admin Django
    │
    └── Agent Remoto
        └── agent.py      - Agent para instalar em VPS remotas
```

## Estrutura de Arquivos Criada

```
AvelarMonitor/
├── agent.py                      # Agent para VPS remotas (do OmniMonitor)
├── omnimonitor/                  # Backup do OmniMonitor (referência)
│   ├── agent/agent.py
│   └── dashboard/omnimonitor/
│
├── apps/multi/                   # App de multi-servidor
│   ├── models.py                 # 10 models: Server, ServerGroup, AgentToken, 
│   │                           # Metric, AlertRule, Alert, NotificationChannel,
│   │                           # Deployment, Backup, CommandHistory
│   ├── consumers.py              # WebSocket consumers
│   ├── views.py                 # Views e APIs
│   ├── urls.py                  # Rotas do app
│   ├── admin.py                 # Admin Django
│   └── consumers.py              # WebSocket
│
├── painel_control/
│   ├── settings.py               # Atualizado com channels + multi
│   ├── asgi.py                  # Atualizado com WebSocket
│   └── urls.py                  # Atualizado com /multi/*
│
└── requirements.txt              # Atualizado com channels, redis, websockets
```

## Configurações Adicionadas

### settings.py
```python
INSTALLED_APPS = [
    ...
    'channels',              # Django Channels para WebSocket
    'apps.multi',            # App de multi-servidor
]

ASGI_APPLICATION = 'painel_control.asgi.application'  # WebSocket

CHANNEL_LAYERS = {           # Redis para canais
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [config('REDIS_URL', default='redis://localhost:6379/1')],
        },
    },
}

MULTI_SERVER_ENABLED = True
MULTI_SERVER_METRICS_RETENTION_DAYS = 30
```

### asgi.py
```python
from apps.multi.consumers import AgentConsumer, DashboardConsumer

websocket_urlpatterns = [
    path('ws/multi/agent/', AgentConsumer.as_asgi()),
    path('ws/multi/dashboard/', DashboardConsumer.as_asgi()),
    path('ws/multi/dashboard/<str:server_id>/', DashboardConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
})
```

### urls.py
```python
urlpatterns = [
    ...
    path('multi/', include('apps.multi.urls')),  # Novo app
    ...
]
```

## Rotas Disponíveis

### Multi-Servidor
| Rota | Descrição |
|------|-----------|
| `/multi/` | Dashboard de multi-servidor |
| `/multi/servers/` | Lista de servidores |
| `/multi/servers/<id>/` | Detalhes do servidor |
| `/multi/servers/<id>/terminal/` | Terminal web |
| `/multi/servers/<id>/metrics/` | Métricas do servidor |
| `/multi/alerts/` | Lista de alertas |
| `/multi/deployments/` | Lista de deployments |
| `/multi/backups/` | Lista de backups |
| `/multi/tokens/` | Lista de tokens de agent |

### WebSocket
| Rota | Descrição |
|------|-----------|
| `/ws/multi/agent/` | Conexão do agent |
| `/ws/multi/dashboard/` | Atualizações do dashboard |

## Como Usar

### 1. Configurar Redis
```bash
sudo apt install redis-server
sudo systemctl start redis
```

### 2. Criar Migrations
```bash
python manage.py makemigrations multi
python manage.py migrate
```

### 3. Iniciar com ASGI
```bash
daphne painel_control.asgi:application -b 0.0.0.0 -p 9999
```

### 4. Criar Token
```python
from apps.multi.models import AgentToken
token = AgentToken.objects.create(name="Minha VPS")
print(token.token)
```

### 5. Instalar Agent na VPS
```bash
# Copiar agent.py
scp agent.py user@vps:/home/user/

# Instalar dependências
pip3 install psutil requests websockets docker

# Executar
python3 agent.py --server http://SEU_PAINEL:9999 --token SEU_TOKEN
```

## Comparativo

| Funcionalidade | AvelarMonitor (Antes) | AvelarMonitor (Depois) |
|----------------|------------------------|------------------------|
| Monitoramento Local | ✅ | ✅ |
| Múltiplos Servidores | ❌ | ✅ |
| WebSocket | ❌ | ✅ |
| Terminal Remoto | ❌ | ✅ |
| Deploy via Git | ❌ | ✅ |
| Backups Automatizados | ❌ | ✅ |
| Alertas Configuráveis | ❌ | ✅ |
| Métricas Históricas | ❌ | ✅ |
| API REST | ❌ | ✅ |

## Próximos Passos

1. ✅ Criar templates HTML para `/multi/*`
2. ✅ Implementar Celery para tarefas assíncronas
3. ✅ Adicionar integração com Prometheus/Grafana
4. ✅ Implementar notificações reais (email, Telegram)
5. ✅ Criar testes automatizados
6. ✅ Adicionar Docker containers para deploy fácil
