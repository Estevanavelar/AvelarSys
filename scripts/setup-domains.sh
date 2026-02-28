#!/bin/bash
# ========================================
# AVELAR SYSTEM - Script de Configuração de Domínios
# ========================================
# Configura Nginx e SSL para:
# - avadmin.avelarcompany.com.br
# - stocktech.avelarcompany.com.br

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AVELAR SYSTEM - Setup de Domínios${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Diretórios
NGINX_CONF_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
PROJECT_NGINX_DIR="/home/avelarsys/AvelarSys/nginx"
CERTBOT_WEBROOT="/var/www/certbot"

# Verificar se está rodando como root ou com sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Este script precisa de permissões de root.${NC}"
    echo -e "${YELLOW}   Executando com sudo...${NC}"
    exec sudo "$0" "$@"
fi

# Passo 1: Criar diretório para certbot
echo -e "${BLUE}[1/6] Criando diretórios necessários...${NC}"
mkdir -p $CERTBOT_WEBROOT
mkdir -p /home/avelarsys/AvelarSys/StockTech/uploads
chown -R www-data:www-data $CERTBOT_WEBROOT
echo -e "${GREEN}✅ Diretórios criados${NC}"

# Passo 2: Copiar configurações HTTP (temporárias)
echo -e "${BLUE}[2/6] Configurando Nginx (HTTP temporário)...${NC}"
cp $PROJECT_NGINX_DIR/avadmin.avelarcompany.com.br.http.conf $NGINX_CONF_DIR/avadmin.avelarcompany.com.br.conf
cp $PROJECT_NGINX_DIR/stocktech.avelarcompany.com.br.http.conf $NGINX_CONF_DIR/stocktech.avelarcompany.com.br.conf

# Criar links simbólicos
ln -sf $NGINX_CONF_DIR/avadmin.avelarcompany.com.br.conf $NGINX_ENABLED_DIR/
ln -sf $NGINX_CONF_DIR/stocktech.avelarcompany.com.br.conf $NGINX_ENABLED_DIR/
echo -e "${GREEN}✅ Configurações Nginx copiadas${NC}"

# Passo 3: Testar e recarregar Nginx
echo -e "${BLUE}[3/6] Testando configuração Nginx...${NC}"
nginx -t
systemctl reload nginx
echo -e "${GREEN}✅ Nginx recarregado${NC}"

# Passo 4: Verificar DNS (antes de obter certificados)
echo -e "${BLUE}[4/6] Verificando resolução DNS...${NC}"

check_dns() {
    local domain=$1
    local ip=$(dig +short $domain A 2>/dev/null | tail -1)
    if [ -z "$ip" ]; then
        echo -e "${RED}❌ DNS não configurado para $domain${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $domain -> $ip${NC}"
        return 0
    fi
}

DNS_OK=true
check_dns "avadmin.avelarcompany.com.br" || DNS_OK=false
check_dns "stocktech.avelarcompany.com.br" || DNS_OK=false

if [ "$DNS_OK" = false ]; then
    echo ""
    echo -e "${YELLOW}⚠️  ATENÇÃO: DNS não está configurado corretamente!${NC}"
    echo -e "${YELLOW}   Configure os registros A no Cloudflare:${NC}"
    echo ""
    echo -e "${YELLOW}   Tipo: A${NC}"
    echo -e "${YELLOW}   Nome: avadmin${NC}"
    echo -e "${YELLOW}   Conteúdo: 217.216.48.148${NC}"
    echo -e "${YELLOW}   Proxy: DNS only (cinza)${NC}"
    echo ""
    echo -e "${YELLOW}   Tipo: A${NC}"
    echo -e "${YELLOW}   Nome: stocktech${NC}"
    echo -e "${YELLOW}   Conteúdo: 217.216.48.148${NC}"
    echo -e "${YELLOW}   Proxy: DNS only (cinza)${NC}"
    echo ""
    echo -e "${YELLOW}   Após configurar, execute este script novamente.${NC}"
    echo ""
    read -p "Deseja continuar mesmo assim? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Passo 5: Obter certificados SSL
echo -e "${BLUE}[5/6] Obtendo certificados SSL com Certbot...${NC}"

# Verificar se certbot está instalado
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Instalando Certbot...${NC}"
    apt update
    apt install -y certbot python3-certbot-nginx
fi

# Obter certificados
echo -e "${BLUE}Obtendo certificado para avadmin.avelarcompany.com.br...${NC}"
certbot certonly --nginx -d avadmin.avelarcompany.com.br \
    --non-interactive --agree-tos \
    --email admin@avelarcompany.com.br \
    --cert-name avadmin.avelarcompany.com.br || {
        echo -e "${YELLOW}⚠️  Falha ao obter certificado para avadmin. Verifique o DNS.${NC}"
    }

echo -e "${BLUE}Obtendo certificado para stocktech.avelarcompany.com.br...${NC}"
certbot certonly --nginx -d stocktech.avelarcompany.com.br \
    --non-interactive --agree-tos \
    --email admin@avelarcompany.com.br \
    --cert-name stocktech.avelarcompany.com.br || {
        echo -e "${YELLOW}⚠️  Falha ao obter certificado para stocktech. Verifique o DNS.${NC}"
    }

# Passo 6: Aplicar configurações HTTPS finais
echo -e "${BLUE}[6/6] Aplicando configurações HTTPS...${NC}"

# Verificar se os certificados existem
if [ -f "/etc/letsencrypt/live/avadmin.avelarcompany.com.br/fullchain.pem" ]; then
    cp $PROJECT_NGINX_DIR/avadmin.avelarcompany.com.br.conf $NGINX_CONF_DIR/avadmin.avelarcompany.com.br.conf
    echo -e "${GREEN}✅ HTTPS configurado para avadmin.avelarcompany.com.br${NC}"
else
    echo -e "${YELLOW}⚠️  Certificado não encontrado para avadmin. Mantendo HTTP.${NC}"
fi

if [ -f "/etc/letsencrypt/live/stocktech.avelarcompany.com.br/fullchain.pem" ]; then
    cp $PROJECT_NGINX_DIR/stocktech.avelarcompany.com.br.conf $NGINX_CONF_DIR/stocktech.avelarcompany.com.br.conf
    echo -e "${GREEN}✅ HTTPS configurado para stocktech.avelarcompany.com.br${NC}"
else
    echo -e "${YELLOW}⚠️  Certificado não encontrado para stocktech. Mantendo HTTP.${NC}"
fi

# Testar e recarregar Nginx
nginx -t && systemctl reload nginx

# Configurar renovação automática
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ CONFIGURAÇÃO CONCLUÍDA!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Domínios configurados:${NC}"
echo -e "  • https://avadmin.avelarcompany.com.br"
echo -e "  • https://stocktech.avelarcompany.com.br"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo -e "  1. Iniciar os backends FastAPI nas portas 8000 e 8001"
echo -e "  2. Testar acesso aos domínios"
echo ""

