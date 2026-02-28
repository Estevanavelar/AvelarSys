#!/bin/bash

# Script para verificar status do Painel AvelarMonitor

echo "📊 Status do Painel de Controle AvelarMonitor"
echo "   Data/Hora: $(date)"
echo ""

# Obter diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Verificar processos
SERVER_PID=$(pgrep -f "manage.py runserver" 2>/dev/null)
if [ -n "$SERVER_PID" ]; then
    echo "✅ Servidor: RODANDO (PID: $SERVER_PID)"

    # Verificar uso de memória e CPU
    if command -v ps &> /dev/null; then
        PROCESS_INFO=$(ps -p $SERVER_PID -o pid,ppid,cmd,%cpu,%mem,etime --no-headers 2>/dev/null)
        if [ -n "$PROCESS_INFO" ]; then
            echo "   📈 Recursos: $PROCESS_INFO"
        fi
    fi
else
    echo "❌ Servidor: PARADO"
fi

# Verificar conectividade HTTP
echo ""
echo "🌐 Teste de conectividade:"
if command -v curl &> /dev/null; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ 2>/dev/null)
    if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "302" ]; then
        echo "✅ HTTP: OK (Status: $HTTP_STATUS)"
    else
        echo "❌ HTTP: FALHA (Status: $HTTP_STATUS)"
    fi
else
    echo "⚠️  curl não disponível para teste HTTP"
fi

# Verificar arquivos de log
echo ""
echo "📝 Logs:"
if [ -d "logs" ]; then
    LOG_FILES=$(ls -la logs/*.log 2>/dev/null | wc -l)
    if [ "$LOG_FILES" -gt 0 ]; then
        echo "✅ Diretório de logs: OK ($LOG_FILES arquivo(s))"
        echo "   📄 Arquivo mais recente:"
        ls -la logs/*.log 2>/dev/null | head -1 | awk '{print "      " $9 " (" $5 " bytes)"}'
    else
        echo "⚠️  Diretório de logs existe, mas sem arquivos"
    fi
else
    echo "❌ Diretório de logs não encontrado"
fi

# Verificar banco de dados
echo ""
echo "🗄️  Banco de dados:"
if [ -f "db.sqlite3" ]; then
    DB_SIZE=$(du -h db.sqlite3 2>/dev/null | cut -f1)
    echo "✅ SQLite: OK (Tamanho: $DB_SIZE)"
else
    echo "❌ Banco de dados não encontrado"
fi

# Verificar ambiente virtual
echo ""
echo "🐍 Ambiente Python:"
if [ -d "venv" ]; then
    echo "✅ Virtualenv: OK"
    if [ -f "venv/bin/python" ]; then
        PYTHON_VERSION=$(venv/bin/python --version 2>&1)
        echo "   🐍 Python: $PYTHON_VERSION"
    fi
else
    echo "❌ Ambiente virtual não encontrado"
fi

# Verificar arquivos estáticos
echo ""
echo "📁 Arquivos estáticos:"
if [ -d "staticfiles" ]; then
    STATIC_COUNT=$(find staticfiles -type f 2>/dev/null | wc -l)
    echo "✅ Static files: OK ($STATIC_COUNT arquivos)"
else
    echo "❌ Arquivos estáticos não coletados"
fi

echo ""
echo "💡 Comandos disponíveis:"
echo "   🔄 Reiniciar: ./start-production.sh"
echo "   🛑 Parar: ./stop-production.sh"
echo "   👀 Logs: tail -f logs/painel.log"
echo "   🔍 Debugging: ./debug.sh"