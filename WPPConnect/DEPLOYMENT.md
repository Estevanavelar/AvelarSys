# 🎯 Guia de Deployment e Boas Práticas

## ✅ Checklist de Deployment

### Antes de Subir em Produção

- [ ] Redis configurado com `maxmemory-policy allkeys-lru`
- [ ] Nginx com rate limiting ajustado conforme seu caso de uso
- [ ] Volumes mapeados corretamente para tokens
- [ ] Variáveis de ambiente no `.env`
- [ ] CORS configurado para seus domínios
- [ ] Backup dos tokens antes de qualquer alteração

### Configuração Inicial

```bash
# 1. Criar rede Docker
docker network create avelarsys-network

# 2. Preparar diretórios
mkdir -p /home/avelarsys/AvelarSys/WPPConnect/tokens-2
mkdir -p /home/avelarsys/AvelarSys/WPPConnect/tokens-3

# 3. Permissões
chmod 755 /home/avelarsys/AvelarSys/WPPConnect/tokens*

# 4. Criar arquivo .env na pasta WPPConnectStack
cp /home/avelarsys/AvelarSys/WPPConnect/env.example /home/avelarsys/WPPConnectStack/.env

# 5. Subir stack
cd /home/avelarsys/WPPConnectStack
docker compose up -d
```

## 🔄 Monitoramento

### Health Checks Automáticos

Todos os serviços têm health checks:

```bash
# Verificar status
docker compose ps

# Esperado: todos "healthy"
CONTAINER                          STATUS
avelarsys-wppconnect-1            healthy
avelarsys-wppconnect-2            healthy
avelarsys-wppconnect-3            healthy
avelarsys-wppconnect-nginx        healthy
avelarsys-wppconnect-redis        healthy
```

### Métricas para Monitorar

```bash
# Memory
docker stats

# Throughput (mensagens/min)
docker logs wppconnect-1 | grep "Enviando mensagem" | wc -l

# Erros
docker logs wppconnect-1 | grep "❌"

# Desconexões
docker logs wppconnect-1 | grep "Desconectar"
```

## 📦 Backup e Restore

### Backup de Sessions

```bash
# Backup de todos os tokens
tar -czf wppconnect-backup-$(date +%Y%m%d).tar.gz \
  /home/avelarsys/AvelarSys/WPPConnect/tokens*

# Salvar em local seguro
mv wppconnect-backup-*.tar.gz /backup/

# Verificar
ls -lah /backup/wppconnect-backup-*.tar.gz
```

### Restore de Sessions

```bash
# Parar containers
docker compose down

# Restaurar
tar -xzf /backup/wppconnect-backup-20260123.tar.gz -C /

# Reiniciar
docker compose up -d
```

## 🔧 Troubleshooting Comum

### WPPConnect não conecta ao WhatsApp

```bash
# 1. Verificar logs
docker logs wppconnect-1

# 2. Procurar por erro
# Se houver "Browser not available":
docker compose restart wppconnect-1

# 3. Se persistir, limpar tokens
rm -rf /home/avelarsys/AvelarSys/WPPConnect/tokens/*
docker compose restart wppconnect-1

# 4. Nova tentativa - será gerado novo QR
```

### Redis não responde

```bash
# Verificar
docker exec avelarsys-wppconnect-redis redis-cli ping

# Se não responder
docker compose restart redis

# Verificar novamente
docker exec avelarsys-wppconnect-redis redis-cli info

# Se continuar com erro
docker compose down
docker compose up -d redis
```

### Nginx retorna 502

```bash
# Verificar upstream
docker exec avelarsys-wppconnect-nginx nginx -t

# Verificar WPPConnect status
docker compose logs wppconnect-1

# Se algum WPPConnect está down
docker compose up -d wppconnect-1

# Reload nginx config
docker exec avelarsys-wppconnect-nginx nginx -s reload
```

## 🚀 Otimizações Avançadas

### Redis Persistence

Para melhor durabilidade, em `docker-compose.yml`:

```yaml
redis:
  command: >
    redis-server
    --save 60 1000
    --appendonly yes
    --appendfsync everysec
```

### Memory Limits

Adicionar limites para evitar OOM:

```yaml
services:
  wppconnect-1:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

### CPU Limits

```yaml
services:
  wppconnect-1:
    deploy:
      resources:
        limits:
          cpus: '2'
```

## 📊 Performance Tuning

### Para Alta Performance

1. **Aumentar workers Nginx**:
```nginx
worker_processes 8;  # ou auto
```

2. **Aumentar connections**:
```nginx
worker_connections 8192;
```

3. **Redis maxclients**:
```bash
docker exec redis redis-cli CONFIG SET maxclients 10000
```

4. **Aumentar file descriptors**:
```bash
# No host (Linux)
ulimit -n 65536
```

### Para Baixo Memory

1. **Reduzir Redis memory**:
```yaml
redis:
  command: redis-server --maxmemory 128mb
```

2. **Desabilitar uma instância** (deixar apenas 2):
```bash
docker compose stop wppconnect-3
```

3. **Aumentar cleanup de logs**:
```bash
docker exec wppconnect-1 sh -c 'echo "max_size: 10m" >> /etc/docker/daemon.json'
```

## 🔐 Segurança

### Firewall Rules

```bash
# Apenas localhost pode acessar Redis
sudo ufw allow from 127.0.0.1 to any port 6379

# Apenas backend pode acessar
sudo ufw allow from 10.0.0.5 to any port 6379

# Load Balancer exposto
sudo ufw allow 8002

# Negar WPPConnect direto (use Nginx)
sudo ufw deny 8003
sudo ufw deny 8004
sudo ufw deny 8005
```

### Environment Secrets

Usar Docker Secrets (Swarm/K8s):

```bash
echo "avelar-wpp-secret-very-secure" | docker secret create wpp_secret -
echo "redis-url-with-auth" | docker secret create redis_url -
```

### Log Cleanup

```bash
# Limpar logs antigos
find /var/lib/docker/containers -name "*.log" -mtime +7 -delete

# Ou via docker
docker system prune --volumes -f
```

## 📈 Escalamento

### Adicionar Instância

```bash
# Atualizar docker-compose.yml
# Adicionar wppconnect-4, wppconnect-5, etc

# Atualizar nginx.conf
# Adicionar servers no upstream

# Rebuild
docker compose up -d --build

# Reload Nginx
docker exec avelarsys-wppconnect-nginx nginx -s reload
```

### Monitoramento de Escala

```bash
# Ver uso de cada instância
for i in 1 2 3; do
  echo "=== WPPConnect $i ==="
  docker stats --no-stream avelarsys-wppconnect-$i
done

# Se algum > 80% CPU
# Adicionar mais instâncias
```

## 🆘 Emergency Procedures

### Restart Total (perder sessions)

```bash
# ⚠️ Aviso: Desconectará tudo
docker compose down -v
docker compose up -d

# Scanear todos os QR codes novamente
```

### Restart Graceful (manter sessions)

```bash
docker compose down
docker compose up -d
# Esperar ~30s para reconectar
```

### Kill de Memória

```bash
# Se WPPConnect consome muita RAM
docker stats avelarsys-wppconnect-1

# Kill e restart
docker restart avelarsys-wppconnect-1

# Monitor
docker logs -f wppconnect-1
```

## 📞 Contato para Suporte

- Logs completos: `docker compose logs > logs.txt`
- Container info: `docker inspect avelarsys-wppconnect-1`
- System info: `docker version && docker compose version`

---

**Atualizado**: Janeiro 2026
