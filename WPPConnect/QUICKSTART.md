# 🚀 Quick Start - WPPConnect Performance v2.0

## ⚡ Primeira Execução (5 minutos)

```bash
# 1. Instalar dependências
cd /home/avelarsys/AvelarSys/WPPConnect
npm install

# 2. Preparar estrutura de diretórios
mkdir -p /home/avelarsys/AvelarSys/WPPConnect/tokens-2
mkdir -p /home/avelarsys/AvelarSys/WPPConnect/tokens-3
chmod 755 /home/avelarsys/AvelarSys/WPPConnect/tokens*

# 3. Criar arquivo .env (copiar do exemplo)
cp /home/avelarsys/AvelarSys/WPPConnect/env.example \
   /home/avelarsys/WPPConnectStack/.env

# 4. Subir stack completa
cd /home/avelarsys/WPPConnectStack
docker compose up -d

# 5. Aguardar health checks
sleep 10
docker compose ps

# 6. Testar
curl http://localhost:8002/api/health
```

## ✅ Verificações

```bash
# Todos os containers devem estar "healthy"
docker compose ps

# Testar endpoint de load balancer
curl -I http://localhost:8002/api/status

# Testar Redis
docker exec avelarsys-wppconnect-redis redis-cli ping
# Esperado: PONG

# Ver logs
docker compose logs -f --tail=50
```

## 📊 Performance

**Esperado:**
- Health check: 50-100ms
- QR Code (cached): 50-80ms  
- Send message: 1-2s
- Mensagens (cached): 100-150ms

## 🎯 Próximos Passos

1. **Conectar WhatsApp**: Acessar QR code em `/api/qrcode`
2. **Testar envios**: Use `/api/send-message`
3. **Monitorar**: `docker stats` e `docker logs -f`
4. **Adicionar mais instâncias**: Editar `docker-compose.yml`

## 🆘 Problemas Comuns

### Redis não conecta
```bash
docker compose restart redis
docker exec avelarsys-wppconnect-redis redis-cli ping
```

### WPPConnect não inicia
```bash
docker compose logs wppconnect-1
# Procurar por erros de Chromium
# Solução: docker compose restart wppconnect-1
```

### Port já em uso
```bash
# Verificar qual processo usa a porta
lsof -i :8002
# Matar se necessário
kill -9 <PID>
```

## 📈 Performance Esperada

- **Throughput**: 300-600 msg/min (3x melhor)
- **Latência**: 500ms-1s (75% mais rápido)
- **Cache**: 10x mais rápido em requisições repetidas
- **Bandwidth**: 70% menos dados transferidos

---

**Docs Completos**: 
- `README.md` - Guia detalhado
- `DEPLOYMENT.md` - Production deployment
- `/docs/whatsapp-saas-architecture.md` - SaaS architecture
