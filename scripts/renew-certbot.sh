#!/bin/bash
# Script para renovar certificados Let's Encrypt
# Para o nginx, renova os certificados, e reinicia o nginx

set -e

cd /home/avelarsys/AvelarSys

echo "🔄 Parando nginx para renovação..."
docker compose -f docker-compose.yml stop nginx

echo "🔐 Renovando certificados Let's Encrypt..."
certbot renew --quiet --standalone

echo "✅ Reiniciando nginx..."
docker compose -f docker-compose.yml start nginx

echo "✅ Renovação concluída!"
