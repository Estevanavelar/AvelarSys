#!/bin/bash

# Script de monitoramento para o AvelarMonitor
# Este script verifica se o painel está rodando e o reinicia se necessário
# Deve ser executado por cron a cada minuto

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/monitor.log"
PID_FILE="$SCRIPT_DIR/avelarmonitor.pid"

# Função de log
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Verificar se o servidor está rodando
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0  # Está rodando
        else
            log "PID file existe mas processo não está rodando (PID: $pid)"
            rm -f "$PID_FILE"
        fi
    fi

    # Verificar por processos manage.py
    if pgrep -f "manage.py runserver" > /dev/null; then
        local current_pid=$(pgrep -f "manage.py runserver")
        echo "$current_pid" > "$PID_FILE"
        log "Processo encontrado mas PID file não existia (PID: $current_pid)"
        return 0  # Está rodando
    fi

    return 1  # Não está rodando
}

# Iniciar o servidor
start_server() {
    log "Iniciando servidor AvelarMonitor..."

    cd "$SCRIPT_DIR"

    # Verificar se o ambiente virtual existe
    if [ ! -d "venv" ]; then
        log "ERRO: Ambiente virtual não encontrado"
        exit 1
    fi

    # Ativar ambiente virtual
    source venv/bin/activate

    # Iniciar com sg docker para garantir acesso ao Docker
    nohup sg docker -c "python manage.py runserver 0.0.0.0:8000" > logs/painel.log 2>&1 &
    local new_pid=$!

    # Salvar PID
    echo "$new_pid" > "$PID_FILE"

    log "Servidor iniciado com PID: $new_pid"

    # Aguardar um pouco para verificar se iniciou
    sleep 3

    # Verificar se está rodando
    if ps -p "$new_pid" > /dev/null 2>&1; then
        log "Servidor iniciado com sucesso"
    else
        log "ERRO: Falha ao iniciar servidor"
        rm -f "$PID_FILE"
    fi
}

# Função principal
main() {
    # Criar diretório de logs se não existir
    mkdir -p "$SCRIPT_DIR/logs"

    # Verificar status
    if is_running; then
        # Verificar se está respondendo
        if curl -s --max-time 5 http://localhost:8000/ > /dev/null 2>&1; then
            log "Servidor está rodando e respondendo"
            exit 0
        else
            log "Servidor não está respondendo, reiniciando..."
            pkill -f "manage.py runserver" 2>/dev/null || true
            rm -f "$PID_FILE"
            sleep 2
            start_server
        fi
    else
        log "Servidor não está rodando, iniciando..."
        start_server
    fi
}

# Executar função principal
main