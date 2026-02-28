# Blue-Green Deployment - Guia Completo da Avelar Company

**Versão:** 1.0  
**Data:** Janeiro 2026  
**Status:** ✅ Production-Ready  
**Escopo:** Estratégia de deploy sem downtime para o AvAdmin e outros stacks

---

## 📋 Sumário

1. [O que é Blue-Green Deployment?](#o-que-é-blue-green-deployment)
2. [Arquitetura na Avelar](#arquitetura-na-avelar)
3. [Componentes](#componentes)
4. [Pré-requisitos](#pré-requisitos)
5. [Configuração](#configuração)
6. [Procedimentos Operacionais](#procedimentos-operacionais)
7. [Exemplos Práticos](#exemplos-práticos)
8. [Scripts de Automação](#scripts-de-automação)
9. [Rollback e Recuperação](#rollback-e-recuperação)
10. [Monitoramento](#monitoramento)
11. [Troubleshooting](#troubleshooting)

---

## O que é Blue-Green Deployment?

### Conceito Fundamental

**Blue-Green Deployment** é uma estratégia de deploy que reduz downtime e risco através da manutenção de dois ambientes de produção idênticos:

- **BLUE (🔵):** Ambiente em produção. Clientes atuais estão aqui.
- **GREEN (🟢):** Novo ambiente com atualização. Sendo testado e validado.

### Diagrama Conceitual

```
┌─────────────────────────────────────────────────────────┐
│         CLIENTES (Acessam a mesma URL)                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   Nginx/Load Balancer  │
        │   (Roteador Inteligente)
        └────┬───────────────┬───┘
             │               │
        ┌────▼──────┐    ┌───▼──────┐
        │   BLUE    │    │  GREEN   │
        │  (v1.0)   │    │  (v1.1)  │
        │  Ativo ✅ │    │  Testes  │
        └───────────┘    └──────────┘
```

### Comparação de Estratégias

| Aspecto | Tradicional | Rolling | Blue-Green |
|---------|-------------|---------|-----------|
| **Downtime** | ⚠️ Alto (5-15 min) | ⚠️ Médio (2-5 min) | ✅ Zero |
| **Rollback** | ⚠️ Difícil | ⚠️ Complexo | ✅ Instantâneo |
| **Custo (Infraestrutura)** | ✅ Baixo | ⚠️ Médio | ⚠️ 2x (2 ambientes) |
| **Teste Completo** | ❌ Não | ⚠️ Parcial | ✅ Completo |
| **Complexidade** | ✅ Simples | ⚠️ Média | ⚠️ Alta |

---

## Arquitetura na Avelar

### Estrutura Geral

```
┌─────────────────────────────────────────────────────────┐
│                  INTERNET (Clientes)                   │
└────────────────────┬────────────────────────────────────┘
                     │
          DNS: avadmin.avelarcompany.com.br
                     │
                     ▼
        ┌────────────────────────────┐
        │   NGINX (Load Balancer)    │
        │   Porta: 80/443            │
        │   (arquivo: nginx.conf)    │
        └────┬──────────────────┬────┘
             │                  │
    ┌────────▼──────┐   ┌──────▼────────┐
    │ AvAdmin-Blue  │   │ AvAdmin-Green │
    │ Porta: 8001   │   │ Porta: 8002   │
    │ Container 1   │   │ Container 2   │
    └───────────────┘   └───────────────┘
             │                  │
             │                  │
    ┌────────▼──────────────────▼────────┐
    │   Banco de Dados (Neon - Shared)  │
    │   Supabase PostgreSQL             │
    └──────────────────────────────────┘
```

### Fluxo de Requisições

**Cenário 1: Blue em Produção (Padrão)**
```
Cliente → Nginx → Lee nginx.conf → upstream avadmin { server blue:8000; }
         → AvAdmin-Blue → Database → Resposta
```

**Cenário 2: Durante Switch para Green**
```
Nginx recebe comando: "mude upstream para green"
Nginx recarrega config (nginx -s reload)
Requisições antigas terminam em Blue
Requisições novas vão para Green
(Zero downtime = nenhuma requisição é perdida)
```

---

## Componentes

### 1. AvAdmin-Blue (Produção Atual)

**Arquivo:** `docker-compose.yml`

Característica:
- Porta interna: `8000`
- Porta externa: `8001` (acesso local para debug)
- Está em produção agora
- Clientes estão usando

### 2. AvAdmin-Green (Próxima Versão)

**Arquivo:** `docker-compose-green.yml` (a ser criado)

Características:
- Porta interna: `8000` (mesma, pois em container diferente)
- Porta externa: `8002` (para testes locais)
- Contém nova versão do código
- Usa mesma database (Neon)
- Ainda não em produção

### 3. Nginx (Roteador)

**Arquivo:** `nginx/avadmin.avelarcompany.com.br.conf`

Responsável por:
- Interceptar requisições para `avadmin.avelarcompany.com.br`
- Rotear para Blue ou Green (conforme `upstream avadmin`)
- Fazer reload (sem perder conexões)

### 4. Database (Compartilhada)

**Tipo:** PostgreSQL (Neon Serverless)
**Acesso:** Blue e Green acessam a mesma DB
**Benefício:** Dados estão sincronizados automaticamente

---

## Pré-requisitos

### 1. Docker & Docker Compose

```bash
docker --version          # v24+
docker-compose --version  # v2.20+
```

### 2. Nginx Configurado

```bash
# Verificar se Nginx está rodando
docker ps | grep nginx

# Nginx deve ter upstream avadmin definido
cat /home/avelarsys/AvelarSys/nginx/avadmin.avelarcompany.com.br.conf | grep -A 5 "upstream avadmin"
```

### 3. Network Docker

```bash
docker network ls | grep avelarsys-network

# Se não existir:
docker network create avelarsys-network
```

### 4. Database (Neon) Acessível

```bash
# Testar conexão
psql -h <neon_host> -U postgres -d postgres -c "SELECT 1;"
```

---

## Configuração

### Passo 1: Criar `docker-compose-green.yml`

No diretório `/home/avelarsys/AvelarSys/AvAdmin/`:

```yaml
version: '3.8'

# ================================================
# BLUE-GREEN: Green (Nova Versão)
# ================================================
# Este arquivo é idêntico ao docker-compose.yml
# Exceto:
# 1. Nomes de containers diferem (green vs default)
# 2. Portas externas diferem (8002 vs 8001)
# 3. Deve usar código da NOVA VERSÃO
# ================================================

services:
  avadmin-green-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_API_URL=http://localhost:8002
    container_name: avelarsys-avadmin-green-frontend
    env_file:
      - ../docker.env
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8002
      - NEXT_PUBLIC_WS_URL=wss://stocktech.avelarcompany.com.br/ws
      - NEXT_PUBLIC_APP_ENV=production
    ports: ["3003:3000"]  # Porta diferente para testes
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - avelarsys-network
    depends_on:
      - avadmin-green-backend
    extra_hosts:
      - "host.docker.internal:host-gateway"

  avadmin-green-backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: avelarsys-avadmin-green-backend
    env_file:
      - ../docker.env
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      - DATABASE_URL=${NEON_DATABASE_URL}
      - CORS_ORIGINS=["https://app.avelarcompany.com.br","https://avadmin.avelarcompany.com.br","https://stocktech.avelarcompany.com.br","http://localhost:3000","http://localhost:3001","http://localhost:3003","http://localhost:5173"]
      - AVADMIN_ALLOWED_HOSTS=localhost,127.0.0.1,avadmin-green-backend,nginx,app.avelarcompany.com.br,avadmin.avelarcompany.com.br
      - SECRET_KEY=${AVADMIN_SECRET_KEY}
      - DEBUG=${AVADMIN_DEBUG:-0}
      - AVADMIN_PORT=8000
      - USE_WPPCONNECT=true
      - WPPCONNECT_URL=http://host.docker.internal:8003
      - WPPCONNECT_SECRET=${WPP_SECRET:-avelar-wpp-secret}
      - WPPCONNECT_SESSION=${WPP_SESSION:-avelar-session}
    ports: ["8002:8000"]  # Porta diferente para testes
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    volumes:
      - ./backend:/app
      - /app/__pycache__
    networks:
      - avelarsys-network

networks:
  avelarsys-network:
    external: true
```

### Passo 2: Atualizar `nginx/avadmin.avelarcompany.com.br.conf`

```nginx
# ================================================
# Blue-Green Upstream Definition
# ================================================
# Para SWITCH: altere "blue" para "green"
# Para ROLLBACK: altere "green" para "blue"
# ================================================

upstream avadmin {
    # BLUE (Padrão - em produção)
    server avadmin-backend:8000;

    # GREEN (Comentado - use para testes)
    # server avadmin-green-backend:8000;
}

server {
    listen 80;
    listen 443 ssl;
    server_name avadmin.avelarcompany.com.br;

    # ... resto da config ...

    location / {
        proxy_pass http://avadmin;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Passo 3: Verificar Network

```bash
docker network inspect avelarsys-network

# Esperado: ambos os containers (blue e green) conectados à network
```

---

## Procedimentos Operacionais

### Procedimento A: Fazer Deploy com Blue-Green

#### Fase 1: Preparação (1-2 horas)

**1. Clone e Prepare o Código Green**

```bash
# No seu workstation local
git clone https://github.com/avelar/avadmin.git avadmin-green
cd avadmin-green
git checkout -b release/v1.1.0
# ... suas mudanças aqui ...
git commit -m "Release v1.1.0"
```

**2. Suba Green em Produção (sem virar público ainda)**

```bash
cd /home/avelarsys/AvelarSys/AvAdmin
docker-compose -f docker-compose-green.yml build --no-cache
docker-compose -f docker-compose-green.yml up -d
```

**3. Verifique a saúde da Green**

```bash
# Health check
curl http://localhost:8002/health/

# Logs
docker logs avelarsys-avadmin-green-backend -f

# Esperado: ✅ Green respondendo normalmente
```

#### Fase 2: Testes (2-4 horas)

**4. Testes Locais (Você acessa Green diretamente)**

```bash
# Frontend (Next.js)
http://localhost:3003

# Backend API (FastAPI)
http://localhost:8002/docs

# Testes de integração
curl -X POST http://localhost:8002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"document":"12345678901","password":"test"}'
```

**5. Testes de Carga (Optional)**

```bash
# Usar ferramenta como Apache JMeter ou locust
# Simular 100 clientes acessando Green
ab -n 1000 -c 100 http://localhost:8002/
```

**6. Validação de Database**

```bash
# Verificar se migrations rodaram
docker exec avelarsys-avadmin-green-backend \
  python -m alembic upgrade head

# Confirmação
psql -h <neon_host> -c "SELECT version();"
```

#### Fase 3: Switch (5 minutos)

**7. Prepare o Switch**

```bash
# Faça backup da config atual (por segurança)
cp /home/avelarsys/AvelarSys/nginx/avadmin.avelarcompany.com.br.conf \
   /home/avelarsys/AvelarSys/nginx/avadmin.avelarcompany.com.br.conf.backup.blue
```

**8. Execute o Switch**

```bash
# Edite nginx.conf
cd /home/avelarsys/AvelarSys/nginx

# Mude de Blue para Green
sed -i 's/server avadmin-backend:8000;/# server avadmin-backend:8000;/g' avadmin.avelarcompany.com.br.conf
sed -i 's/# server avadmin-green-backend:8000;/server avadmin-green-backend:8000;/g' avadmin.avelarcompany.com.br.conf

# Reload Nginx (zero downtime)
docker exec nginx nginx -s reload

# Esperado: ✅ Sem erro, Nginx recarregou
```

**9. Monitore após Switch (15-30 minutos)**

```bash
# Health check em tempo real
watch -n 1 'curl -s http://localhost:8002/health/ | jq'

# Logs de requisições
docker logs nginx -f | grep avadmin

# Alertas (se tiver Prometheus/Grafana)
curl http://monitoring:9090/api/v1/query?query=error_rate
```

---

## Exemplos Práticos

### Exemplo 1: Deploy da v1.1.0 (Sem Clientes Percebendo)

```bash
# ============ FASE 1: PREPARAÇÃO ============
cd /home/avelarsys/AvelarSys/AvAdmin

# 1. Build Green
docker-compose -f docker-compose-green.yml build --no-cache

# 2. Suba Green
docker-compose -f docker-compose-green.yml up -d

# 3. Aguarde inicialização
sleep 30

# 4. Teste saúde
curl http://localhost:8002/health/
# ✅ Sucesso

# ============ FASE 2: TESTES ============

# 5. Acesse frontend Green
curl http://localhost:3003
# ✅ Carrega

# 6. Teste API
curl -X GET http://localhost:8002/api/dashboard
# ✅ Responde

# 7. Testes funcionais (seu time)
# - Login ✅
# - Crud Módulos ✅
# - Relatórios ✅
# - Webhooks ✅

# ============ FASE 3: SWITCH ============

# 8. Editar nginx
cd /home/avelarsys/AvelarSys/nginx
sed -i 's/server avadmin-backend:8000;/# server avadmin-backend:8000;/' avadmin.avelarcompany.com.br.conf
sed -i 's/# server avadmin-green-backend:8000;/server avadmin-green-backend:8000;/' avadmin.avelarcompany.com.br.conf

# 9. Reload Nginx
docker exec nginx nginx -s reload
echo "✅ Switch executado em $(date)"

# 10. Monitorar (5 minutos)
curl -s https://avadmin.avelarcompany.com.br/health/ | jq
# ✅ Verde = Green respondendo

# 11. Deletar Blue (após 24h confirmação)
docker-compose down
# Ou manter Blue para rollback rápido
```

### Exemplo 2: Rollback de Emergência (30 segundos)

```bash
# ============ CENÁRIO: Green está com problema ============

# 1. Simptom: erro 500 em produçao
curl https://avadmin.avelarcompany.com.br/api/users
# ❌ Error 500

# 2. Decisão: fazer rollback

# 3. Editar nginx
cd /home/avelarsys/AvelarSys/nginx
sed -i 's/server avadmin-green-backend:8000;/# server avadmin-green-backend:8000;/' avadmin.avelarcompany.com.br.conf
sed -i 's/# server avadmin-backend:8000;/server avadmin-backend:8000;/' avadmin.avelarcompany.com.br.conf

# 4. Reload
docker exec nginx nginx -s reload

# 5. Verificar
curl https://avadmin.avelarcompany.com.br/api/users
# ✅ Sucesso (voltou para Blue v1.0)

# 6. Logs para investigar problema
docker logs avelarsys-avadmin-green-backend > /tmp/green-error-$(date +%s).log
```

---

## Scripts de Automação

### Script 1: `deploy-blue-green.sh`

```bash
#!/bin/bash

set -e

BASE_PATH="/home/avelarsys/AvelarSys/AvAdmin"
NGINX_PATH="/home/avelarsys/AvelarSys/nginx"
NGINX_CONF="$NGINX_PATH/avadmin.avelarcompany.com.br.conf"

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Blue-Green Deployment Script${NC}"
echo -e "${BLUE}================================${NC}\n"

# ============ PHASE 1: Build Green ============
echo -e "${YELLOW}📦 Fase 1: Building Green...${NC}"
cd $BASE_PATH
docker-compose -f docker-compose-green.yml build --no-cache
echo -e "${GREEN}✅ Green Build OK${NC}\n"

# ============ PHASE 2: Start Green ============
echo -e "${YELLOW}🟢 Fase 2: Starting Green...${NC}"
docker-compose -f docker-compose-green.yml up -d
echo -e "${GREEN}✅ Green Started${NC}"
echo "   Frontend: http://localhost:3003"
echo "   Backend: http://localhost:8002"
echo -e "${NC}\n"

# ============ PHASE 3: Health Checks ============
echo -e "${YELLOW}🏥 Fase 3: Health Checks...${NC}"

# Wait for services to be ready
echo "   Aguardando 30s para inicialização..."
sleep 30

# Backend health
echo -n "   Verificando Backend... "
if curl -s http://localhost:8002/health/ | grep -q "healthy"; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌ Backend não respondendo!${NC}"
    exit 1
fi

# Frontend health
echo -n "   Verificando Frontend... "
if curl -s http://localhost:3003 | grep -q "html"; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌ Frontend não respondendo!${NC}"
    exit 1
fi

echo -e "\n"

# ============ PHASE 4: Confirm Switch ============
echo -e "${YELLOW}⚠️  Fase 4: Confirmar Switch${NC}"
echo "   Green está pronta para produção?"
read -p "   Digite 'sim' para prosseguir: " confirm

if [ "$confirm" != "sim" ]; then
    echo -e "${RED}Cancelado. Green continua em standby.${NC}"
    exit 0
fi

# ============ PHASE 5: Switch ============
echo -e "\n${YELLOW}🔄 Fase 5: Executando Switch...${NC}"

# Backup current config
cp $NGINX_CONF $NGINX_CONF.backup.$(date +%s)
echo "   Backup criado: $NGINX_CONF.backup.*"

# Execute switch
sed -i 's/server avadmin-backend:8000;/# server avadmin-backend:8000;/' $NGINX_CONF
sed -i 's/# server avadmin-green-backend:8000;/server avadmin-green-backend:8000;/' $NGINX_CONF

# Reload Nginx
docker exec nginx nginx -s reload

echo -e "${GREEN}✅ Switch Executado${NC}\n"

# ============ PHASE 6: Monitor ============
echo -e "${YELLOW}📊 Fase 6: Monitorando (60 segundos)...${NC}"

for i in {1..12}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" https://avadmin.avelarcompany.com.br/api/dashboard || echo "000")
    if [ "$response" = "200" ]; then
        echo -e "   [${GREEN}OK${NC}] (${i}s)"
    else
        echo -e "   [${RED}HTTP $response${NC}] (${i}s)"
    fi
    sleep 5
done

echo -e "\n${GREEN}✅ Deploy Completo!${NC}"
echo -e "${GREEN}Clientes estão usando v1.1.0 (Green)${NC}"
```

### Script 2: `rollback-blue-green.sh`

```bash
#!/bin/bash

set -e

NGINX_PATH="/home/avelarsys/AvelarSys/nginx"
NGINX_CONF="$NGINX_PATH/avadmin.avelarcompany.com.br.conf"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${RED}🔙 Blue-Green Rollback Script${NC}"
echo -e "${RED}==============================${NC}\n"

echo -e "${RED}⚠️  ROLLBACK: Voltando para Blue...${NC}\n"

# Execute rollback
sed -i 's/server avadmin-green-backend:8000;/# server avadmin-green-backend:8000;/' $NGINX_CONF
sed -i 's/# server avadmin-backend:8000;/server avadmin-backend:8000;/' $NGINX_CONF

# Reload Nginx
docker exec nginx nginx -s reload

echo -e "${GREEN}✅ Rollback Executado${NC}"
echo -e "${GREEN}Clientes voltaram para v1.0 (Blue)${NC}"
```

---

## Rollback e Recuperação

### Cenários de Rollback

#### Cenário 1: Erro Detectado Imediatamente (< 1 min)

```bash
# Revert config
sed -i 's/server avadmin-green-backend:8000;/# server avadmin-green-backend:8000;/' nginx.conf
sed -i 's/# server avadmin-backend:8000;/server avadmin-backend:8000;/' nginx.conf

# Reload
docker exec nginx nginx -s reload

# Resultado: Clientes voltam para Blue em < 30 segundos
```

#### Cenário 2: Problema em Database (Migrations Failed)

```bash
# 1. Parar Green
docker-compose -f docker-compose-green.yml down

# 2. Rollback Nginx
# (conforme cenário 1)

# 3. Investigar DB
docker logs avelarsys-avadmin-green-backend | grep -i "alembic\|migration"

# 4. Corrigir problema
# (fix migration, retest)

# 5. Tentar deploy novamente
```

#### Cenário 3: Problema em Cache/Sessões

```bash
# Se Green tem problema com cache (Redis)
# 1. Verificar Redis
docker logs redis

# 2. Limpar cache de Green (se necessário)
docker exec redis redis-cli FLUSHDB

# 3. Rollback para Blue
# (conforme cenário 1)
```

---

## Monitoramento

### Durante Deploy (Ao Vivo)

```bash
# Terminal 1: Nginx Logs
docker logs nginx -f | grep -i "upstream\|switch"

# Terminal 2: Backend Logs (Green)
docker logs avelarsys-avadmin-green-backend -f

# Terminal 3: Health Check Loop
watch -n 1 'curl -s https://avadmin.avelarcompany.com.br/health/ | jq'

# Terminal 4: Database Connections
docker exec postgres psql -U postgres -c \
  "SELECT usename, count(*) FROM pg_stat_activity GROUP BY usename;"
```

### Métricas Importantes

```bash
# Taxa de erro pré vs pós switch
curl http://monitoring:9090/api/v1/query?query=rate(http_errors_total[5m])

# Latência (p50, p95, p99)
curl http://monitoring:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_duration_seconds_bucket[5m]))

# CPU/Memória de Green vs Blue
docker stats avelarsys-avadmin-green-backend avelarsys-avadmin-backend
```

---

## Troubleshooting

### Problema 1: Green não inicia

```bash
# Verificar logs
docker logs avelarsys-avadmin-green-backend

# Possíveis causas:
# 1. Porta 8002 já em uso
netstat -tulpn | grep 8002

# 2. Network não existe
docker network inspect avelarsys-network

# 3. ENV vars faltando
docker inspect avelarsys-avadmin-green-backend | grep -i "env"
```

### Problema 2: Switch não funciona (Nginx erro)

```bash
# Verificar sintaxe nginx
docker exec nginx nginx -t

# Se erro, restaurar backup
cp nginx.conf.backup.XXX nginx.conf

# Retry reload
docker exec nginx nginx -s reload
```

### Problema 3: Green responde, mas Clientes recebem erro 502

```bash
# Causa: Nginx não consegue conectar a Green

# Checklist:
# 1. Containers na mesma network?
docker network inspect avelarsys-network | grep -E "avadmin-(backend|green)"

# 2. Green respondendo internamente?
docker exec nginx curl http://avadmin-green-backend:8000/health/

# 3. Firewall bloqueando?
docker exec nginx telnet avadmin-green-backend 8000
```

### Problema 4: Rollback lento (Conexões não terminam)

```bash
# Verificar conexões ativas em Blue
docker exec postgres psql -U postgres -c \
  "SELECT * FROM pg_stat_activity WHERE datname='postgres';"

# Forçar disconnect de Green (se necessário)
docker-compose -f docker-compose-green.yml down

# Aguardar 30s
sleep 30

# Retry nginx reload
docker exec nginx nginx -s reload
```

---

## Boas Práticas

### ✅ DO (Faça)

- ✅ **Sempre test Green** antes de switch (mínimo 2 horas)
- ✅ **Mantenha Blue rodando** por 24h após switch (para rollback rápido)
- ✅ **Monitore por 15-30 min** após switch
- ✅ **Faça backup nginx.conf** antes de cada switch
- ✅ **Use scripts** para evitar erros manuais
- ✅ **Documente cada deploy** (date, version, issues)
- ✅ **Teste rollback** regularmente

### ❌ DON'T (Não Faça)

- ❌ **Não faça switch sem testar** Green
- ❌ **Não delete Blue** imediatamente após switch
- ❌ **Não faça switch** durante horário de pico (ex: 9-10h)
- ❌ **Não altere database schema** sem migration
- ❌ **Não dependa de apenas observação visual** - use scripts
- ❌ **Não faça deploy sozinho** - tenha alguém disponível para rollback

---

## Roadmap & Melhorias

### Próximas Versões

- [ ] **Automação Completa:** CI/CD (GitHub Actions) que faz deploy automaticamente
- [ ] **Canary Deployment:** 10% clientes → Green, 90% → Blue (validação gradual)
- [ ] **Database Failover:** Ter database backup em caso de problema
- [ ] **Status Page:** Mostrar em tempo real qual versão está ativa
- [ ] **Slack Notifications:** Alertas de deploy, rollback, errors

---

## Referências

- [Blue-Green Deployment (Martin Fowler)](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- [Nginx Upstream Module](http://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [Docker Compose Best Practices](https://docs.docker.com/compose/production/)
- [PostgreSQL Connection Management](https://www.postgresql.org/docs/current/runtime-config-connection.html)

---

**Status:** ✅ Production-Ready  
**Última Atualização:** Janeiro 2026  
**Mantido por:** Time de DevOps Avelar  
**Versionado em:** `docs/BLUE_GREEN_DEPLOYMENT.md`
