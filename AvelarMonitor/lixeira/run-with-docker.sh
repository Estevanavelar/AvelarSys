#!/bin/bash

# Wrapper para executar o Django com acesso ao Docker
# Este script garante que o processo tenha acesso ao grupo docker

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ativar ambiente virtual
source venv/bin/activate

# Configurar variáveis de ambiente
export DJANGO_SETTINGS_MODULE=painel_control.settings
export PYTHONPATH="$SCRIPT_DIR:$PYTHONPATH"

# Verificar se está no grupo docker
if groups | grep -q docker; then
    # Executar com grupo docker ativo usando sg
    exec sg docker -c "python manage.py runserver 0.0.0.0:8000 $@"
else
    # Executar normalmente se não estiver no grupo
    exec python manage.py runserver 0.0.0.0:8000 "$@"
fi
