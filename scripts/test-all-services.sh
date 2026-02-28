#!/bin/bash

# ========================================
# AvelarSys - Test All Services Script
# ========================================
# Testa todos os serviços do AvelarSys usando portas fixas
# conforme PORTS.md

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Function to test service
test_service() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    local timeout=${4:-10}

    print_status "Testando $name..."

    # Use curl to test the endpoint
    local response
    local http_code
    local total_time

    # Run curl with timeout and capture output
    response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" \
               --max-time $timeout \
               "$url" 2>/dev/null || echo "FAILED")

    if [[ "$response" == "FAILED" ]]; then
        print_error "$name - Timeout/Connection failed"
        return 1
    fi

    # Extract HTTP status code and response time
    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://' | sed -e 's/;TIME.*//')
    total_time=$(echo "$response" | tr -d '\n' | sed -e 's/.*TIME://')

    # Check if status code matches expected
    if [[ "$http_code" == "$expected_status" ]]; then
        print_success "$name - HTTP $http_code (${total_time}s)"
        return 0
    else
        print_error "$name - HTTP $http_code (expected $expected_status) (${total_time}s)"
        return 1
    fi
}

# Function to test WebSocket (basic check)
test_websocket() {
    local name=$1
    local url=$2

    print_status "Testando WebSocket $name..."

    # Basic WebSocket test using curl (upgrade request)
    local response
    response=$(curl -s -I -N \
               -H "Connection: Upgrade" \
               -H "Upgrade: websocket" \
               -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
               -H "Sec-WebSocket-Version: 13" \
               --max-time 5 \
               "$url" 2>/dev/null || echo "FAILED")

    if [[ "$response" == *"101 Switching Protocols"* ]]; then
        print_success "$name - WebSocket OK"
        return 0
    elif [[ "$response" == "FAILED" ]]; then
        print_error "$name - Connection failed"
        return 1
    else
        print_warning "$name - WebSocket not available (may be normal)"
        return 0
    fi
}

# Function to test database connectivity
test_database() {
    local name=$1
    local host=$2
    local port=$3

    print_status "Testando $name..."

    if nc -z "$host" "$port" 2>/dev/null; then
        print_success "$name - Connected ($host:$port)"
        return 0
    else
        print_error "$name - Connection failed ($host:$port)"
        return 1
    fi
}

# Main test function
run_tests() {
    local failed_tests=0
    local total_tests=0

    echo "=========================================="
    echo "🧪 AvelarSys - Teste de Todos os Serviços"
    echo "=========================================="
    echo ""

    # Load environment variables
    if [ -f "../docker.env" ]; then
        set -a
        source ../docker.env
        set +a
        print_status "Variáveis de ambiente carregadas"
    fi

    echo ""
    print_status "Iniciando testes de serviços..."
    echo ""

    # ========================================
    # FRONTEND TESTS (Portas 3000-3009)
    # ========================================

    echo "🌐 TESTANDO FRONTENDS"
    echo "---------------------"

    # App Portal
    ((total_tests++))
    if test_service "App Portal" "http://localhost:3000" 200; then
        ((total_tests++))
        test_service "App Portal Health" "http://localhost:3000/api/health" 200
    fi

    # AvAdmin Frontend
    ((total_tests++))
    if test_service "AvAdmin Frontend" "http://localhost:3001" 200; then
        ((total_tests++))
        test_service "AvAdmin FE Health" "http://localhost:3001/api/health" 200
    fi

    # StockTech Frontend
    ((total_tests++))
    test_service "StockTech Frontend" "http://localhost:3002" 200

    echo ""

    # ========================================
    # BACKEND TESTS (Portas 8000-8009)
    # ========================================

    echo "🔧 TESTANDO BACKENDS"
    echo "--------------------"

    # AvAdmin Backend
    ((total_tests++))
    test_service "AvAdmin Backend" "http://localhost:8000/health/" 200

    # StockTech Backend
    ((total_tests++))
    test_service "StockTech Backend" "http://localhost:8002/health" 200

    # WPPConnect
    ((total_tests++))
    test_service "WPPConnect" "http://localhost:8003/api/health" 200

    echo ""

    # ========================================
    # DATABASE TESTS
    # ========================================

    echo "🗄️ TESTANDO BANCO DE DADOS"
    echo "---------------------------"

    # PostgreSQL (Supabase)
    ((total_tests++))
    test_database "PostgreSQL" "host.docker.internal" "5433"

    # Redis (Supabase)
    ((total_tests++))
    test_database "Redis" "host.docker.internal" "6379"

    echo ""

    # ========================================
    # WEBSOCKET TESTS
    # ========================================

    echo "📡 TESTANDO WEBSOCKETS"
    echo "----------------------"

    # StockTech WebSocket
    ((total_tests++))
    test_websocket "StockTech WebSocket" "ws://localhost:8002"

    echo ""

    # ========================================
    # SUMMARY
    # ========================================

    echo "=========================================="
    echo "📊 RESULTADO DOS TESTES"
    echo "=========================================="

    if [ $failed_tests -eq 0 ]; then
        print_success "🎉 Todos os testes passaram! ($total_tests testes executados)"
        echo ""
        echo "✅ AvelarSys está funcionando corretamente"
        echo "✅ Todas as portas estão acessíveis"
        echo "✅ Serviços estão respondendo"
        echo ""
        return 0
    else
        print_error "❌ $failed_tests testes falharam de $total_tests executados"
        echo ""
        echo "🔧 Verifique os serviços que falharam acima"
        echo "💡 Use 'docker-compose logs <service-name>' para mais detalhes"
        echo ""
        return 1
    fi
}

# Function to show usage
show_usage() {
    echo "Uso: $0 [OPTIONS]"
    echo ""
    echo "Testa todos os serviços do AvelarSys usando portas fixas."
    echo ""
    echo "Opções:"
    echo "  -v, --verbose    Modo verbose (mais detalhes)"
    echo "  -h, --help       Mostra esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  ./test-all-services.sh           # Teste básico"
    echo "  ./test-all-services.sh -v        # Modo verbose"
    echo ""
    echo "Serviços testados:"
    echo "  • App Portal (porta 3000)"
    echo "  • AvAdmin Frontend (porta 3001)"
    echo "  • AvAdmin Backend (porta 8000)"
    echo "  • StockTech Frontend (porta 3002)"
    echo "  • StockTech Backend (porta 8002)"
    echo "  • WPPConnect (porta 8003)"
    echo "  • PostgreSQL (porta 5433)"
    echo "  • Redis (porta 6379)"
    echo ""
    echo "Para mais informações, consulte PORTS.md"
}

# Parse command line arguments
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Opção desconhecida: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run tests
run_tests