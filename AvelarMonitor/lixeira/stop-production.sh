#!/bin/bash

# Script otimizado para parar o servidor do painel

echo "🛑 Parando Painel de Controle AvelarMonitor..."
echo "   Data/Hora: $(date)"
echo ""

# Verificar se há processos rodando
SERVER_PIDS=$(pgrep -f "manage.py runserver" 2>/dev/null)

if [ -n "$SERVER_PIDS" ]; then
    echo "📊 Processos encontrados: $SERVER_PIDS"

    # Parar processos graciosamente primeiro
    pkill -TERM -f "manage.py runserver" 2>/dev/null
    sleep 3

    # Forçar parada se ainda estiver rodando
    if pgrep -f "manage.py runserver" > /dev/null; then
        echo "⚠️  Forçando parada dos processos..."
        pkill -KILL -f "manage.py runserver" 2>/dev/null
        sleep 1
    fi

    # Verificar se parou
    if pgrep -f "manage.py runserver" > /dev/null; then
        echo "❌ Erro ao parar servidor. Pode haver processos zumbis."
        exit 1
    else
        echo "✅ Servidor parado com sucesso!"
    fi
else
    echo "ℹ️  Nenhum processo do servidor em execução."
fi

echo ""
echo "💡 Para reiniciar: ./start-production.sh"

