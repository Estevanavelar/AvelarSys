# OmniMonitor - Monitor Geral para VPS

Sistema de monitoramento centralizado para múltiplas VPS com arquitetura Agent + Dashboard.

## Arquitetura

```
                    ┌─────────────────────────┐
                    │   Dashboard Central    │
                    │   (Django + Redis)     │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │  WebSocket/HTTP API     │
                    └────────────┬────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
   ┌────────┴────────┐  ┌────────┴────────┐  ┌────────┴────────┐
   │  Agent VPS #1   │  │  Agent VPS #2   │  │  Agent VPS #N   │
   │  (Python)       │  │  (Python)       │  │  (Python)       │
   └─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Componentes

### Dashboard Central
- Interface web para visualização de todas as VPS
- Alertas e notificações
- Histórico de métricas
- Terminal remoto
- Deploy/rollback via Git
- Gestão de backups

### Agent
- Coleta de métricas em tempo real
- Execução de comandos remotos
- Monitoramento de serviços
- Upload de backups
- Leve e minimalista

## Tecnologias

- **Dashboard**: Django + Django Channels (WebSocket)
- **Database**: PostgreSQL + Redis
- **Agent**: Python 3.8+ + psutil
- **Comm**: WebSocket + REST API
- **Frontend**: Bootstrap 5 + Chart.js
- **Real-time**: Django Channels + Redis

## Instalação Rápida

### Dashboard

```bash
cd dashboard
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

### Agent (na VPS)

```bash
cd agent
pip install -r requirements.txt
python agent.py --server https://dashboard.example.com --token YOUR_TOKEN
```

## Features

- Monitoramento em tempo real de CPU, memória, disco, rede
- Execução de comandos remotos
- Terminal web integrado
- Logs streaming
- Alertas por email, Telegram, Slack
- Deploy via Git
- Backups automatizados
- Multi-usuário com RBAC
- API REST
- Histórico de métricas

## Licença

MIT
