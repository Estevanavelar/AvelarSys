#!/bin/bash
# Script para configurar SSL/HTTPS para o Supabase

SUDO_PASSWORD="1583"

echo "Configurando SSL para banco.avelarcompany.dev.br..."
echo ""

# Verificar se certbot está instalado
if ! command -v certbot &> /dev/null; then
    echo "Instalando Certbot..."
    echo "$SUDO_PASSWORD" | sudo -S apt update
    echo "$SUDO_PASSWORD" | sudo -S apt install -y certbot python3-certbot-nginx
fi

# Obter certificado SSL
echo "Obtendo certificado SSL do Let's Encrypt..."
echo "$SUDO_PASSWORD" | sudo -S certbot --nginx -d banco.avelarcompany.dev.br --non-interactive --agree-tos --email admin@avelarcompany.dev.br

# Configurar renovação automática
echo "Configurando renovação automática do certificado..."
echo "$SUDO_PASSWORD" | sudo -S systemctl enable certbot.timer
echo "$SUDO_PASSWORD" | sudo -S systemctl start certbot.timer

echo ""
echo "SSL configurado com sucesso!"
echo "O certificado será renovado automaticamente."

