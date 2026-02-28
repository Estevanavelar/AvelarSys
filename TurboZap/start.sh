#!/bin/sh
set -e

# Criar diretórios se não existirem
mkdir -p /app/data /app/logs

# Ajustar permissões
chmod -R 777 /app/data /app/logs

# Verificar se consegue escrever no diretório
touch /app/data/.write_test && rm /app/data/.write_test

echo "✅ Diretórios configurados com sucesso"

# Iniciar aplicação
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1