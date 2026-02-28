#!/bin/bash
# Hook para renovação do certbot
# Este script é chamado antes e depois da renovação

ACTION="$1"

cd /home/avelarsys/AvelarSys

if [ "$ACTION" = "pre" ]; then
    echo "🔄 Parando nginx para renovação..."
    docker compose -f docker-compose.yml stop nginx || true
elif [ "$ACTION" = "post" ]; then
    echo "✅ Reiniciando nginx após renovação..."
    docker compose -f docker-compose.yml start nginx || docker compose -f docker-compose.yml up -d nginx
fi
