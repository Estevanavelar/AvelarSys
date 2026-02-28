#!/bin/bash

# Checklist rápido para deployment do AvelarMonitor

set -e

echo "========================================="
echo "  Checklist Deployment AvelarMonitor"
echo "  Domínio: amo.avelarcompany.dev.br"
echo "========================================="
echo ""

CORRECT="\033[0;32m"
CHECK="\033[0;33m"
DONE="\033[0;32m"
NC="\033[0m"

# Função para checar item
check_item() {
    if eval "$2"; then
        echo -e "${DONE}✓${NC} $1"
        return 0
    else
        echo -e "${CORRECT}✗${NC} $1"
        return 1
    fi
}

# Checklist
TOTAL=0
PASS=0
FAIL=0

echo "📋 Pré-requisitos"
check_item "Docker instalado" "command -v docker" && ((TOTAL++, PASS++)) || ((TOTAL++, FAIL++))
check_item "Docker Compose instalado" "command -v docker compose" && ((TOTAL++, PASS++)) || ((TOTAL++, FAIL++))
check_item "Porta 9999 disponível" "! netstat -tuln | grep 9999" && ((TOTAL++, PASS++)) || ((TOTAL++, FAIL++))
check_item "Docker rodando" "systemctl is-active --quiet docker" && ((TOTAL++, PASS++)) || ((TOTAL++, FAIL++))

echo ""
echo "📝 Arquivos de configuração"
check_item ".env.amo existe" "test -f .env.amo" && ((TOTAL++, PASS++)) || ((TOTAL++, FAIL++))
check_item "docker-compose.yml existe" "test -f docker-compose.yml" && ((TOTAL++, PASS++)) || ((TOTAL++, FAIL++))
check_item "Dockerfile existe" "test -f Dockerfile" && ((TOTAL++, PASS++)) || ((TOTAL++, FAIL++))

echo ""
echo "🔐 Credenciais"
check_item "ALLOWED_HOSTS configurado" "grep -q 'amo.avelarcompany.dev.br' .env.example" && ((TOTAL++, PASS++)) || ((TOTAL++, FAIL++))"
check_item "Cloudflare token configurado" "grep -q 'CLOUDFLARE_API_TOKEN' .env.example" && ((TOTAL++, PASS++)) || ((TOTAL++, FAIL++))"
check_item "Zone ID configurado" "grep -q 'CLOUDFLARE_ZONE_ID_AMO' .env.example" && ((TOTAL++, PASS++)) || ((TOTAL++, FAIL++))"

echo ""
echo "📊 Serviços configurados"
check_item "PostgreSQL service definido" "grep -q 'postgres:' docker-compose.yml" && ((TOTAL++, PASS++)) || ((TOTAL++, FAIL++))"
check_item "Redis service definido" "grep -q 'redis:' docker-compose.yml" && ((TOTAL++, PASS++)) || ((TOTAL++, FAIL++))"
check_item "Celery worker definido" "grep -q 'celery-worker:' docker-compose.yml" && ((TOTAL++, PASS++)) || ((TOTAL++, FAIL++))"
check_item "Celery beat definido" "grep -q 'celery-beat:' docker-compose.yml" && ((TOTAL++, PASS++)) || ((TOTAL++, FAIL++))"

echo ""
echo "🌐 Rede"
check_item "ALLOWED_HOSTS inclui IP" "grep -q '217.216.48.148' .env.example" && ((TOTAL++, PASS++)) || ((TOTAL++, FAIL++))"
check_item "ALLOWED_HOSTS inclui 0.0.0.0" "grep -q '0.0.0.0' .env.example" && ((TOTAL++, PASS++)) || ((TOTAL++, FAIL++))"
check_item "APP_PORT configurado como 9999" "grep -q 'APP_PORT=9999' .env.example" && ((TOTAL++, PASS++)) || ((TOTAL++, FAIL++))"

echo ""
echo "========================================="
echo -e "${CHECK}Total: $TOTAL${NC} | ${DONE}Pass: $PASS${NC} | ${CORRECT}Fail: $FAIL${NC}"
echo "========================================="
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${DONE}✓${NC} Pronto para deploy! Execute:"
    echo ""
    echo "  cp .env.amo .env"
    echo "  docker compose up -d"
    echo ""
else
    echo -e "${CORRECT}✗${NC} Configure os itens acima antes do deploy"
fi
