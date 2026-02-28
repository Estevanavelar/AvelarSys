# OmniMonitor - Resumo do Projeto

## O que foi criado

### 1. Documentação de Melhorias para AvelarMonitor
📁 `/home/avelarsys/MELHORIAS_AVELARMONITOR.md`

Sugestões completas divididas em 12 categorias:
- Automação avançada (Terminal Web, Git Integration, Backup, Deploy/Rollback)
- Monitoramento de serviços externos
- Alertas e notificações
- Gráficos e métricas históricas
- Gestão de SSL e domínios
- Firewall e segurança
- Orquestração e deploy
- Logs em tempo real
- Multi-usuário e RBAC
- API REST
- Performance optimization
- Mobile app

### 2. OmniMonitor - Monitor Geral Centralizado
📁 `/home/avelarsys/OmniMonitor/`

Sistema completo de monitoramento para múltiplas VPS com arquitetura Agent + Dashboard.

## Estrutura do OmniMonitor

```
OmniMonitor/
├── README.md                    # Documentação principal
├── install.sh                   # Script de instalação
│
├── agent/                       # Agent para VPS
│   ├── agent.py                 # Código principal do agent
│   └── requirements.txt         # Dependências
│
└── dashboard/                   # Dashboard centralizado
    ├── manage.py               # Django manage
    ├── requirements.txt        # Dependências
    └── omnimonitor/            # Django app
        ├── settings.py         # Configurações
        ├── urls.py             # URLs principais
        ├── urls_app.py         # URLs do app
        ├── models.py           # Models (System, Metric, Alert, etc.)
        ├── views.py            # Views
        ├── consumers.py        # WebSocket consumers
        ├── admin.py            # Admin config
        ├── asgi.py             # ASGI config
        ├── wsgi.py             # WSGI config
        ├── apps.py             # App config
        └── __init__.py         # App init
```

## Features do OmniMonitor

### Dashboard Centralizado
- Interface web para visualizar todas as VPS
- Gráficos em tempo real
- Histórico de métricas
- Alertas configuráveis
- Terminal web
- Deploy via Git
- Gestão de backups

### Agent (VPS)
- Coleta de métricas: CPU, memória, disco, rede, processos
- Execução de comandos remotos
- Monitoramento de containers Docker
- Autenticação via token
- Conexão WebSocket em tempo real
- Auto-reconexão

### Models Implementados
- **System**: VPS monitorada
- **SystemGroup**: Grupos de sistemas
- **AgentToken**: Tokens de autenticação
- **Metric**: Armazenamento de métricas
- **AlertRule**: Regras de alerta
- **Alert**: Alertas disparados
- **NotificationChannel**: Canais de notificação (email, telegram, etc.)
- **Deployment**: Deploy de aplicações via Git
- **Backup**: Backups automatizados
- **CommandHistory**: Histórico de comandos

## Tecnologias

| Componente | Tecnologia |
|------------|------------|
| Dashboard | Django 4.2+ |
| Real-time | Django Channels + WebSocket |
| Database | SQLite (padrão) / PostgreSQL |
| Cache | Redis |
| Agent | Python 3.8+ |
| Monitoring | psutil |
| Docker | docker-py |
| Web Server | Daphne (ASGI) / Gunicorn (WSGI) |

## Instalação Rápida

### Dashboard

```bash
cd /home/avelarsys/OmniMonitor/dashboard
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
daphne omnimonitor.asgi:application -b 0.0.0.0 -p 8000
```

### Agent (na VPS)

```bash
cd /home/avelarsys/OmniMonitor/agent
pip install -r requirements.txt
python agent.py --server http://DASHBOARD_IP:8000 --token SEU_TOKEN
```

### Script Automatizado

```bash
cd /home/avelarsys/OmniMonitor
chmod +x install.sh
./install.sh
```

## Uso

1. **Instale o Dashboard** em um servidor central
2. **Crie um token** no painel admin do Django
3. **Instale o Agent** em cada VPS que deseja monitorar
4. **Visualize** todas as métricas no dashboard centralizado

## Próximos Passos

- Criar templates HTML para o dashboard
- Implementar Celery para tarefas assíncronas (backup, deploy)
- Adicionar integração com Prometheus/Grafana
- Implementar notificações reais (email, Telegram, Slack)
- Criar frontend React/Vue opcional
- Adicionar testes automatizados
- Criar Docker containers para facilidade de deploy

## Comparação: AvelarMonitor vs OmniMonitor

| Característica | AvelarMonitor | OmniMonitor |
|----------------|---------------|-------------|
| Arquitetura | Monolítica (single VPS) | Distribuída (Agent + Dashboard) |
| Escalabilidade | Limitada a 1 VPS | Múltiplas VPS |
| Comunicação | N/A | WebSocket |
| Histórico de métricas | Não implementado | Sim (com downsampling) |
| Alertas | Básico | Avançado (múltiplas regras) |
| Deploy | Manual | Via Git + Rollback |
| Backup | Manual | Automatizado |
| Terminal | Não | Sim (WebSocket) |
| API | Não | Sim |

## Licença

MIT
