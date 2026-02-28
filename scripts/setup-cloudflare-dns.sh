#!/bin/bash
# ========================================
# AVELAR SYSTEM - Configurar DNS no Cloudflare
# ========================================
# Cria registros A para:
# - avadmin.avelarcompany.com.br
# - stocktech.avelarcompany.com.br

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CLOUDFLARE DNS - Avelar System${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configurações do Cloudflare
ZONE_ID="2b08ffd50fd051c32dc047020bcac941"  # avelarcompany.com.br
VPS_IP="217.216.48.148"

# Verificar se o token foi passado como argumento ou variável de ambiente
if [ -z "$CF_API_TOKEN" ]; then
    if [ -z "$1" ]; then
        echo -e "${YELLOW}⚠️  Token da API do Cloudflare não fornecido.${NC}"
        echo ""
        echo -e "${BLUE}OPÇÃO 1: Criar um API Token no Cloudflare:${NC}"
        echo "  1. Acesse: https://dash.cloudflare.com/profile/api-tokens"
        echo "  2. Clique em 'Create Token'"
        echo "  3. Use o template 'Edit zone DNS'"
        echo "  4. Selecione a zona 'avelarcompany.com.br'"
        echo "  5. Copie o token gerado"
        echo ""
        echo -e "${BLUE}OPÇÃO 2: Configurar manualmente no painel:${NC}"
        echo "  1. Acesse: https://dash.cloudflare.com"
        echo "  2. Selecione 'avelarcompany.com.br'"
        echo "  3. Vá em 'DNS' > 'Records'"
        echo "  4. Adicione os seguintes registros:"
        echo ""
        echo -e "${YELLOW}  ┌─────────┬────────────┬─────────────────┬───────┐${NC}"
        echo -e "${YELLOW}  │ Tipo    │ Nome       │ Conteúdo        │ Proxy │${NC}"
        echo -e "${YELLOW}  ├─────────┼────────────┼─────────────────┼───────┤${NC}"
        echo -e "${YELLOW}  │ A       │ avadmin    │ 217.216.48.148  │ Off   │${NC}"
        echo -e "${YELLOW}  │ A       │ stocktech  │ 217.216.48.148  │ Off   │${NC}"
        echo -e "${YELLOW}  └─────────┴────────────┴─────────────────┴───────┘${NC}"
        echo ""
        echo -e "${BLUE}Depois de configurar, execute:${NC}"
        echo "  ./scripts/setup-domains.sh"
        echo ""
        echo -e "${YELLOW}Para usar a API, execute:${NC}"
        echo "  CF_API_TOKEN=seu_token ./scripts/setup-cloudflare-dns.sh"
        echo "  # ou"
        echo "  ./scripts/setup-cloudflare-dns.sh seu_token"
        exit 0
    else
        CF_API_TOKEN="$1"
    fi
fi

echo -e "${BLUE}Usando API Token do Cloudflare...${NC}"
echo ""

# Função para criar registro DNS
create_dns_record() {
    local name=$1
    local content=$2
    
    echo -e "${BLUE}Criando registro A para ${name}.avelarcompany.com.br...${NC}"
    
    # Verificar se já existe
    existing=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=A&name=${name}.avelarcompany.com.br" \
        -H "Authorization: Bearer ${CF_API_TOKEN}" \
        -H "Content-Type: application/json" | jq -r '.result[0].id // empty')
    
    if [ -n "$existing" ]; then
        echo -e "${YELLOW}Registro já existe. Atualizando...${NC}"
        response=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${existing}" \
            -H "Authorization: Bearer ${CF_API_TOKEN}" \
            -H "Content-Type: application/json" \
            --data "{\"type\":\"A\",\"name\":\"${name}\",\"content\":\"${content}\",\"ttl\":1,\"proxied\":false}")
    else
        response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
            -H "Authorization: Bearer ${CF_API_TOKEN}" \
            -H "Content-Type: application/json" \
            --data "{\"type\":\"A\",\"name\":\"${name}\",\"content\":\"${content}\",\"ttl\":1,\"proxied\":false}")
    fi
    
    success=$(echo $response | jq -r '.success')
    if [ "$success" = "true" ]; then
        echo -e "${GREEN}✅ ${name}.avelarcompany.com.br -> ${content}${NC}"
    else
        error=$(echo $response | jq -r '.errors[0].message // "Erro desconhecido"')
        echo -e "${RED}❌ Falha: ${error}${NC}"
        return 1
    fi
}

# Criar registros
create_dns_record "avadmin" "$VPS_IP"
create_dns_record "stocktech" "$VPS_IP"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ REGISTROS DNS CRIADOS!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Aguarde a propagação do DNS (1-5 minutos)${NC}"
echo ""
echo -e "${BLUE}Depois, execute:${NC}"
echo "  ./scripts/setup-domains.sh"
echo ""

