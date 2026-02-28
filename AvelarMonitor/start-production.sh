#!/bin/bash

# Script otimizado para iniciar o painel em produção (background)

# Obter diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

# Verificar se ambiente virtual existe
if [ ! -d "venv" ]; then
    echo "❌ Ambiente virtual não encontrado. Execute ./setup.sh primeiro."
    exit 1
fi

# Ativar ambiente virtual
source venv/bin/activate

# Verificar se Django está instalado
if ! python -c "import django" 2>/dev/null; then
    echo "❌ Django não está instalado. Execute ./setup.sh primeiro."
    exit 1
fi

# Parar servidor anterior se estiver rodando
echo "🛑 Parando servidor anterior..."
pkill -f "manage.py runserver" 2>/dev/null || true
sleep 2

# Criar diretório de logs se não existir
mkdir -p logs

# Limpar logs antigos (manter últimos 7 dias)
find logs -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true

# Configurar variáveis de ambiente para produção
export DJANGO_SETTINGS_MODULE=painel_control.settings
export PYTHONPATH="$SCRIPT_DIR:$PYTHONPATH"

# Iniciar servidor em background com configurações otimizadas
echo "🚀 Iniciando Painel de Controle AvelarMonitor em produção..."
echo "   Data/Hora: $(date)"
echo "   Diretório: $SCRIPT_DIR"
echo ""

# Usar nohup com configurações otimizadas e acesso ao Docker
nohup sg docker -c "python manage.py runserver 0.0.0.0:8000 --noreload --insecure --verbosity=1" \
    > logs/painel.log 2>&1 &

# Aguardar um pouco para verificar se iniciou
sleep 5

# Verificar se está rodando
if pgrep -f "manage.py runserver" > /dev/null; then
    echo "✅ Servidor iniciado com sucesso!"
    echo "   🌐 URL: http://0.0.0.0:8000"
    echo "   👤 Usuário: AvelarComp"
    echo "   🔑 Senha: @Acompany0605"
    echo "   📝 Logs: logs/painel.log"
    echo "   📊 PID: $(pgrep -f "manage.py runserver")"
    echo ""
    echo "📋 Comandos úteis:"
    echo "   Parar servidor: ./stop-production.sh"
    echo "   Ver logs: tail -f logs/painel.log"
    echo "   Monitorar: htop ou ps aux | grep runserver"
    echo ""
    echo "💡 Dica: Use um servidor web (Nginx) como proxy reverso para produção"
else
    echo "❌ Erro ao iniciar servidor. Verifique os logs: logs/painel.log"
    echo "📄 Últimas linhas do log:"
    tail -10 logs/painel.log 2>/dev/null || echo "   (arquivo de log não encontrado)"
    exit 1
fi

