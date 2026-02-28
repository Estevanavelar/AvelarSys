#!/bin/bash

set -e

echo "🚀 Iniciando AvelarSys em MODO DESENVOLVIMENTO..."
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📋 Verificando pré-requisitos...${NC}"
echo ""

# Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker não está rodando.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker está rodando${NC}"

# Supabase
echo -n "Verificando Supabase (localhost:5433)... "
if nc -z localhost 5433 2>/dev/null; then
    echo -e "${GREEN}✅ Acessível${NC}"
else
    echo -e "${RED}❌ Não está acessível${NC}"
    echo -e "${YELLOW}⚠️  Verifique se o Supabase está rodando na porta 5433${NC}"
    read -p "Deseja continuar mesmo assim? (s/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✅ Pré-requisitos OK${NC}"
echo ""

# Iniciar serviços de desenvolvimento (nginx fora do script)
echo -e "${BLUE}🐳 Iniciando containers em modo desenvolvimento...${NC}"
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d \
    stocktech-backend \
    stocktech-frontend \
    app-portal \
    avadmin-frontend \
    avadmin-backend \
    wppconnect

echo ""
echo -e "${GREEN}✅ Ambiente iniciado!${NC}"
echo ""

sleep 3

echo -e "${BLUE}📊 Status dos containers:${NC}"
docker compose ps
echo ""

echo -e "${YELLOW}📡 URLs para acessar:${NC}"
echo "  - StockTech Frontend:   http://localhost:3000"
echo "  - StockTech Backend:    http://localhost:8002"
echo "  - StockTech Vite Dev:   http://localhost:5173"
echo "  - AppPortal:            http://localhost:3000"
echo "  - AvAdmin Frontend:     http://localhost:3001"
echo "  - AvAdmin Backend:      http://localhost:8000"
echo ""

echo -e "${YELLOW}📝 Para ver logs:${NC}"
echo "  Backend StockTech:  docker compose logs -f stocktech-backend"
echo "  Frontend StockTech: docker compose logs -f stocktech-frontend"
echo "  Todos:              docker compose logs -f"
echo ""

echo -e "${YELLOW}🗄️  Bancos de Dados:${NC}"
echo "  - StockTech: Supabase Local (localhost:5433)"
echo "  - AvAdmin:   NEON Cloud"
echo ""
