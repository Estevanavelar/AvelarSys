# 🐳 AvelarMonitor - Docker Deployment

Deploy completo do AvelarMonitor com Docker Compose.

## Serviços Incluídos

| Serviço | Imagem | Descrição |
|---------|--------|-----------|
| **app** | Python 3.11 | Aplicação Django com WebSocket |
| **postgres** | PostgreSQL 15 | Banco de dados (opcional) |
| **redis** | Redis 7 | Cache e WebSocket channels |
| **celery-worker** | Python 3.11 | Tarefas assíncronas |
| **celery-beat** | Python 3.11 | Agendamento de tarefas |

## Requisitos

- Docker 20.10+
- Docker Compose 2.0+

## Configuração Rápida

### 1. Criar arquivo .env

```bash
cp .env.example .env
nano .env
```

### 2. Editar variáveis importantes

```env
# Alterar SECRET_KEY para algo seguro
SECRET_KEY=$(openssl rand -base64 32)

# DEBUG em produção deve ser False
DEBUG=False

# Porta exposta (9999)
APP_PORT=9999

# Senha do superusuário Django
DJANGO_SUPERUSER_PASSWORD=sua_senha_segura
```

### 3. Iniciar containers

```bash
# Subir todos os serviços
docker compose up -d

# Verificar status
docker compose ps

# Ver logs
docker compose logs -f app
```

## Acesso

- **Painel**: http://localhost:9999
- **Admin Django**: http://localhost:9999/admin
- **WebSocket**: ws://localhost:9999/ws/multi/agent/

### Credenciais Padrão

- **Usuário**: admin
- **Senha**: (definida em `DJANGO_SUPERUSER_PASSWORD`)

## Estrutura de Volumes

| Volume | Descrição |
|--------|-----------|
| `postgres_data` | Dados do PostgreSQL |
| `redis_data` | Dados do Redis |
| `sqlite_data` | Banco SQLite (se não usar PostgreSQL) |
| `media_data` | Uploads de arquivos |
| `logs_data` | Logs da aplicação |

## Comandos Úteis

```bash
# Iniciar serviços
docker compose up -d

# Parar serviços
docker compose down

# Reiniciar serviço específico
docker compose restart app

# Ver logs em tempo real
docker compose logs -f app
docker compose logs -f celery-worker
docker compose logs -f celery-beat

# Executar comandos no container
docker compose exec app python manage.py shell
docker compose exec app python manage.py createsuperuser
docker compose exec app python manage.py migrate

# Atualizar containers
docker compose pull
docker compose up -d

# Remover tudo (incluindo volumes)
docker compose down -v
```

## Instalar Agent em VPS Remota

### 1. Criar token no Dashboard

```bash
# Acessar o shell Django
docker compose exec app python manage.py shell

>>> from apps.multi.models import AgentToken
>>> token = AgentToken.objects.create(name="Minha VPS")
>>> print(token.token)
>>> exit()
```

### 2. Executar Agent via Docker

```bash
# Copiar o agent.py para a VPS
scp agent/agent.py user@vps:/home/user/

# Criar Dockerfile do agent
nano Dockerfile.agent
```

```dockerfile
FROM python:3.11-alpine
WORKDIR /agent
COPY agent.py .
RUN pip install psutil requests websockets docker
CMD ["python", "agent.py", "--server", "http://SEU_PAINEL:9999", "--token", "SEU_TOKEN"]
```

```bash
# Build e rodar agent
docker build -f Dockerfile.agent -t omnimonitor-agent .
docker run -d --name omnimonitor-agent \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  omnimonitor-agent
```

### 3. Verificar conexão

```bash
# Verificar se o agent está conectado
docker compose exec app python manage.py shell
>>> from apps.multi.models import Server
>>> [s.hostname for s in Server.objects.all()]
>>> exit()
```

## Usar PostgreSQL (Recomendado)

Por padrão, o AvelarMonitor usa SQLite. Para usar PostgreSQL:

```bash
# O PostgreSQL já está configurado no docker-compose.yml
# Basta garantir que as variáveis de ambiente estão definidas no .env

POSTGRES_DB=avelarmonitor
POSTGRES_USER=avelar
POSTGRES_PASSWORD=sua_senha_segura
```

O app detectará automaticamente o PostgreSQL.

## Monitoramento e Debug

### Verificar saúde dos containers

```bash
docker compose ps
docker compose top
```

### Verificar recursos

```bash
docker stats
```

### Logs específicos

```bash
# Logs do app Django
docker compose logs app

# Logs do Celery
docker compose logs celery-worker

# Logs do Redis
docker compose logs redis
```

## Backup e Restore

### Backup dos volumes

```bash
# Backup de todos os volumes
docker run --rm -v avelar-postgres_data:/data -v avelar-redis_data:/redis -v avelar-sqlite_data:/sqlite -v $(pwd):/backup alpine tar -czf /backup/avelar-backup.tar.gz /data /redis /sqlite
```

### Restore dos volumes

```bash
docker run --rm -v avelar-postgres_data:/data -v avelar-redis_data:/redis -v avelar-sqlite_data:/sqlite -v $(pwd):/backup alpine tar -xzf /backup/avelar-backup.tar.gz -C /
docker compose restart
```

## Atualização

```bash
# 1. Fazer backup
docker compose exec app python manage.py dumpdata > backup.json

# 2. Parar containers
docker compose down

# 3. Pull novo código
git pull

# 4. Rebuild
docker compose build

# 5. Subir
docker compose up -d

# 6. Migrations
docker compose exec app python manage.py migrate

# 7. Restore (se necessário)
docker compose exec app python manage.py loaddata < backup.json
```

## Troubleshooting

### O app não inicia

```bash
# Ver logs
docker compose logs app

# Verificar dependências
docker compose ps

# Verificar portas
netstat -tuln | grep 9999
```

### WebSocket não conecta

```bash
# Verificar Redis
docker compose logs redis

# Verificar CHANNEL_LAYERS
docker compose exec app python manage.py shell
>>> from django.conf import settings
>>> print(settings.CHANNEL_LAYERS)
```

### Agent não conecta

```bash
# Verificar firewall
sudo ufw allow 9999/tcp

# Verificar token
docker compose exec app python manage.py shell
>>> from apps.multi.models import AgentToken
>>> print([t.name for t in AgentToken.objects.all()])
```

## Produção

### Habilitar HTTPS

Configure seu Nginx existente como proxy reverso:

```nginx
server {
    listen 443 ssl http2;
    server_name seu-dominio.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:9999;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /ws/ {
        proxy_pass http://localhost:9999;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Variáveis de Ambiente para Produção

```env
DEBUG=False
SECRET_KEY=$(openssl rand -base64 32)
ALLOWED_HOSTS=seu-dominio.com,www.seu-dominio.com

# PostgreSQL com senha forte
POSTGRES_DB=avelarmonitor
POSTGRES_USER=avelar
POSTGRES_PASSWORD=$(openssl rand -base64 24)

# Redis (pode ser externo)
REDIS_URL=redis://redis:6379/1

# Celery
CELERY_BROKER_URL=redis://redis:6379/2
CELERY_RESULT_BACKEND=redis://redis:6379/2
```

## Suporte

Para problemas ou dúvidas, consulte a documentação principal em `README.md`.
