# 🚀 Deploy AvelarMonitor - amo.avelarcompany.dev.br

Deploy completo do AvelarMonitor configurado para o domínio **amo.avelarcompany.dev.br**.

## Informações

| Parâmetro | Valor |
|-----------|-------|
| **Domínio** | amo.avelarcompany.dev.br |
| **IP** | 217.216.48.148 |
| **Porta** | 9999 |
| **Protocolo** | HTTP/HTTPS (via Nginx) |

## Credenciais Padrão

| Serviço | Usuário | Senha |
|---------|---------|-------|
| **AvelarMonitor** | AvelarComp | @Acompany0605 |
| **PostgreSQL** | avelar | AvelarPostgres@2026 |
| **Superusuário** | AvelarComp | @Acompany0605 |

## Credenciais de Serviços

### Cloudflare DNS
```
API Token: BxO05sMwLtkW49khd7uyB0D83RgRIGIJWTXZTnIA
Zone ID: 9ab70bfff6238cc01706bd42f156e06d
Account ID: 5fe57a71b94fdaa622301b0a192edb91
```

### Supabase (opcional)
```
URL: postgresql://supabase_admin:77bfbc034480395c92c0e19d94cda932d2726dd87fd7b0c56e5e68ce68d99dcc@127.0.0.1:5433/postgres
```

## Deploy Rápido

### Opção 1: Script Automatizado

```bash
cd /home/avelarsys/AvelarSys/AvelarMonitor
./deploy.sh
```

### Opção 2: Passo a Passo

```bash
# 1. Copiar configuração pré-configurada
cp .env.amo .env

# 2. Build e subir containers
docker compose build
docker compose up -d

# 3. Verificar status
docker compose ps

# 4. Ver logs
docker compose logs -f app
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

## Nginx Proxy (Configuração para seu Nginx existente)

Adicione este bloco ao seu Nginx:

```nginx
# AvelarMonitor - amo.avelarcompany.dev.br
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name amo.avelarcompany.dev.br;
    
    # SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/amo.avelarcompany.dev.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/amo.avelarcompany.dev.br/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Headers de segurança
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Uploads
    client_max_body_size 25M;
    
    # Proxy HTTP
    location / {
        proxy_pass http://localhost:9999;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:9999;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Arquivos estáticos
    location /static/ {
        proxy_pass http://localhost:9999;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Arquivos de upload
    location /media/ {
        proxy_pass http://localhost:9999;
        expires 7d;
    }
}

# Redirecionar HTTP para HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name amo.avelarcompany.dev.br;
    return 301 https://$server_name$request_uri;
}
```

## Obter Token de Agent

```bash
# Via Docker
docker compose exec app python manage.py shell
```

```python
from apps.multi.models import AgentToken

# Criar novo token
token = AgentToken.objects.create(name="Minha VPS")
print(f"Token: {token.token}")
```

## Instalar Agent em VPS Remota

### Via Docker

```bash
# Build imagem do agent
docker build -f agent/Dockerfile -t omnimonitor-agent .

# Rodar agent
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

## Comandos Úteis

```bash
# Ver status
docker compose ps

# Ver logs
docker compose logs -f app
docker compose logs -f celery-worker
docker compose logs -f celery-beat

# Reiniciar serviço específico
docker compose restart app
docker compose restart postgres
docker compose restart redis

# Acessar shell Django
docker compose exec app python manage.py shell

# Criar superusuário
docker compose exec app python manage.py createsuperuser

# Executar migrations
docker compose exec app python manage.py migrate

# Coletar static
docker compose exec app python manage.py collectstatic

# Backup do banco
docker compose exec app python manage.py dumpdata > backup.json

# Restore do banco
docker compose exec -T app python manage.py loaddata < backup.json
```

## Troubleshooting

### Porta 9999 não acessível

```bash
# Verificar se o container está rodando
docker compose ps

# Verificar se a porta está exposta
netstat -tuln | grep 9999

# Verificar firewall
sudo ufw status
sudo ufw allow 9999/tcp
```

### Containers não iniciam

```bash
# Ver logs de todos os containers
docker compose logs

# Rebuild containers
docker compose down
docker compose build --no-cache
docker compose up -d
```

### WebSocket não conecta

```bash
# Verificar Redis
docker compose logs redis

# Verificar configuração do WebSocket no settings
docker compose exec app python manage.py shell
>>> from django.conf import settings
>>> print(settings.CHANNEL_LAYERS)
```

### Nginx proxy não funciona

```bash
# Verificar configuração do Nginx
sudo nginx -t

# Recarregar Nginx
sudo nginx -s reload

# Verificar logs do Nginx
sudo tail -f /var/log/nginx/error.log
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
docker compose exec -T app python manage.py loaddata < backup.json
```

## Backup e Restore

### Backup dos Volumes

```bash
# Backup de todos os volumes
docker run --rm \
  -v avelar-postgres_data:/data \
  -v avelar-redis_data:/redis \
  -v avelar-sqlite_data:/sqlite \
  -v $(pwd):/backup \
  alpine tar -czf /backup/amo-avelar-backup.tar.gz /data /redis /sqlite
```

### Restore dos Volumes

```bash
# Restore dos volumes
docker run --rm \
  -v avelar-postgres_data:/data \
  -v avelar-redis_data:/redis \
  -v avelar-sqlite_data:/sqlite \
  -v $(pwd):/backup \
  alpine tar -xzf /backup/amo-avelar-backup.tar.gz -C /

# Reiniciar containers
docker compose restart
```

## Monitoramento

### Verificar saúde dos serviços

```bash
# Verificar status dos containers
docker compose ps

# Verificar uso de recursos
docker stats

# Verificar logs do app
docker compose logs --tail=100 app
```

### Métricas do Sistema

- CPU: Verifique o painel AvelarMonitor
- Memória: Verifique o painel AvelarMonitor  
- Disco: Verifique o painel AvelarMonitor
- Rede: Verifique o painel AvelarMonitor

## Links Úteis

- **Painel AvelarMonitor**: https://amo.avelarcompany.dev.br
- **Admin Django**: https://amo.avelarcompany.dev.br/admin
- **Cloudflare Dashboard**: https://dash.cloudflare.com/9ab70bfff6238cc01706bd42f156e06d/amo.avelarcompany.dev.br
- **Supabase Console**: https://console.supabase.com/

## Documentação

- **[README.md](README.md)** - Documentação principal
- **[DOCKER.md](DOCKER.md)** - Documentação Docker completa
- **[INTEGRACAO_OMNIMONITOR.md](INTEGRACAO_OMNIMONITOR.md)** - Integração multi-servidor
- **[DOCKER_CONFIGURADO.md](DOCKER_CONFIGURADO.md)** - Configuração Docker

## Suporte

Para problemas ou dúvidas, entre em contato com a equipe de desenvolvimento.
