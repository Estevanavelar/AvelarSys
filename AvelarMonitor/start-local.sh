#!/bin/bash
# Script para iniciar o AvelarMonitor localmente

cd /home/avelarsys/AvelarSys/AvelarMonitor

# Ativar virtual environment
source venv/bin/activate

# Criar diretórios necessários
mkdir -p logs media staticfiles

# Executar migrações
python manage.py migrate --noinput

# Coletar arquivos estáticos
python manage.py collectstatic --noinput

# Iniciar o servidor Daphne na porta 9999
echo "Iniciando AvelarMonitor na porta 9999..."
exec daphne -b 0.0.0.0 -p 9999 painel_control.asgi:application
