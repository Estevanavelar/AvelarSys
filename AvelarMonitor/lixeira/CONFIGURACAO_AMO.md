# ✅ Configuração Completa - amo.avelarcompany.dev.br

## Resumo das Configurações

### Domínio e IP
- **Domínio**: amo.avelarcompany.dev.br
- **IP**: 217.216.48.148
- **Porta**: 9999

### Credenciais do Sistema
| Serviço | Usuário | Senha |
|---------|---------|-------|
| AvelarMonitor | AvelarComp | @Acompany0605 |
| PostgreSQL | avelar | AvelarPostgres@2026 |

### Credenciais de Serviços Externos
#### Cloudflare DNS
```
API Token: BxO05sMwLtkW49khd7uyB0D83RgRIGIJWTXZTnIA
Zone ID: 9ab70bfff6238cc01706bd42f156e06d
Account ID: 5fe57a71b94fdaa622301b0a192edb91
```

#### Supabase (opcional)
```
URL: postgresql://supabase_admin:77bfbc034480395c92c0e19d94cda932d2726dd87fd7b0c56e5e68ce68d99dcc@127.0.0.1:5433/postgres
```

## Arquivos de Configuração

### .env (Pre-configurado para amo.avelarcompany.dev.br)
Arquivo: `.env.amo`

```env
SECRET_KEY=$(openssl rand -base64 32)
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,amo.avelarcompany.dev.br,217.216.48.148
APP_PORT=9999
POSTGRES_DB=avelarmonitor
POSTGRES_USER=avelar
POSTGRES_PASSWORD=AvelarPostgres@2026
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
CLOUDFLARE_API_TOKEN=BxO05sMwLtkW49khd7uyB0D83RgRIGIJWTXZTnIA
CLOUDFLARE_ZONE_ID_AMO=9ab70bfff6238cc01706bd42f156e06d
CLOUDFLARE_ACCOUNT_ID=5fe57a71b94fdaa622301b0a192edb91
CLOUDFLARE_ZONE_AMO=amo.avelarcompany.dev.br
REDIS_URL=redis://redis:6379/1
MULTI_SERVER_ENABLED=True
METRICS_RETENTION_DAYS=30
CELERY_BROKER_URL=redis://redis:6379/2
CELERY_RESULT_BACKEND=redis://redis:6379/2
DJANGO_SUPERUSER_USERNAME=AvelarComp
DJANGO_SUPERUSER_EMAIL=admin@avelarcompany.dev.br
DJANGO_SUPERUSER_PASSWORD=@Acompany0605
HOST_ROOT_PATH=/
```

### docker-compose.yml
- 5 serviços: app, postgres, redis, celery-worker, celery-beat
- Porta 9999 exposta
- Volumes persistentes configurados
- Configurações do Cloudflare injetadas

### painel_control/settings.py
- ALLOWED_HOSTS inclui: amo.avelarcompany.dev.br, 217.216.48.148
- Configurações do Cloudflare adicionadas

### Nginx (configuração para seu Nginx existente)
Proxy reverso para porta 9999 com suporte a WebSocket

## Deploy

### Opção 1: Script Automatizado
```bash
cd /home/avelarsys/AvelarSys/AvelarMonitor
./deploy.sh
```

### Opção 2: Docker Compose
```bash
# Usar configuração pré-configurada
cp .env.amo .env
docker compose up -d
```

## Acesso ao Sistema

### Via IP
- **Painel**: http://217.216.48.148:9999
- **Admin**: http://217.216.48.148:9999/admin

### Via Domínio
- **Painel**: https://amo.avelarcompany.dev.br
- **Admin**: https://amo.avelarcompany.dev.br/admin

### WebSocket
- **Agent**: wss://amo.avelarcompany.dev.br/ws/multi/agent/
- **Dashboard**: wss://amo.avelarcompany.dev.br/ws/multi/dashboard/

## Obter Agent Token

O script deploy.sh cria automaticamente um token chamado "Agent-Master".

Para obter:
```bash
docker compose exec app python manage.py shell
>>> from apps.multi.models import AgentToken
>>> token = AgentToken.objects.get(name="Agent-Master")
>>> print(token.token)
>>> exit()
```

## Instalar Agent em VPS Remota

### Via Docker
```bash
# Build
docker build -f agent/Dockerfile -t omnimonitor-agent .

# Rodar
docker run -d --name omnimonitor-agent \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  omnimonitor-agent \
  --server https://amo.avelarcompany.dev.br \
  --token SEU_TOKEN
```

### Via Python
```bash
# Instalar dependências
pip3 install psutil requests websockets docker

# Executar
python3 agent.py \
  --server https://amo.avelarcompany.dev.br \
  --token SEU_TOKEN
```

## Serviços Docker

| Serviço | Imagem | Porta | Descrição |
|---------|--------|-------|-----------|
| app | Python 3.11 | 9999 | Django + WebSocket |
| postgres | PostgreSQL 15 | 5432 (interna) | Banco de dados |
| redis | Redis 7 | 6379 (interna) | Cache + Channels |
| celery-worker | Python 3.11 | - | Tarefas assíncronas |
| celery-beat | Python 3.11 | - | Agendamento de tarefas |

## Nginx Proxy

O arquivo `DEPLOY_AMO.md` contém a configuração completa do Nginx para seu domínio.

Pontos importantes:
- Proxy reverso para porta 9999
- Suporte a WebSocket em `/ws/`
- Headers de segurança
- Uploads de até 25MB

## Comandos Úteis

```bash
# Verificar status
docker compose ps

# Ver logs
docker compose logs -f app
docker compose logs -f celery-worker

# Reiniciar
docker compose restart

# Acessar shell Django
docker compose exec app python manage.py shell

# Criar superusuário
docker compose exec app python manage.py createsuperuser

# Executar migrations
docker compose exec app python manage.py migrate

# Backup do banco
docker compose exec app python manage.py dumpdata > backup.json

# Restore do banco
docker compose exec -T app python manage.py loaddata < backup.json
```

## Troubleshooting

### Porta 9999 bloqueada
```bash
# Verificar firewall
sudo ufw status
sudo ufw allow 9999/tcp

# Verificar se está ouvindo
netstat -tuln | grep 9999
```

### Agent não conecta
- Verificar token criado
- Verificar firewall permitindo porta 9999
- Verificar logs do agent
- Verificar logs do app Django

### WebSocket não funciona
- Verificar configuração do Nginx
- Verificar se o Redis está rodando
- Verificar logs do Redis

## Monitoramento

### Verificar saúde dos serviços
```bash
docker compose ps
docker compose top
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

# Logs do PostgreSQL
docker compose logs postgres
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
docker compose build --no-cache

# 5. Subir
docker compose up -d

# 6. Migrations
docker compose exec app python manage.py migrate

# 7. Coletar static
docker compose exec app python manage.py collectstatic --noinput

# 8. Reiniciar
docker compose restart
```

## Documentação

- **[DEPLOY_AMO.md](DEPLOY_AMO.md)** - Deploy específico do domínio
- **[README.md](README.md)** - Documentação principal
- **[DOCKER.md](DOCKER.md)** - Documentação Docker completa
- **[INTEGRACAO_OMNIMONITOR.md](INTEGRACAO_OMNIMONITOR.md)** - Integração multi-servidor

## Checklist de Deploy

- [ ] Copiar .env.amo para .env
- [ ] Build containers
- [ ] Subir containers
- [ ] Verificar status
- [ ] Executar migrations
- [ ] Criar superusuário
- [ ] Obter agent token
- [ ] Configurar Nginx
- [ ] Testar acesso via IP
- [ ] Testar acesso via domínio
- [ ] Instalar agent em VPS
- [ ] Verificar conexão do agent
- [ ] Configurar Cloudflare DNS
