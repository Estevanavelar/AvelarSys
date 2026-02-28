#!/bin/bash

set -e

echo "========================================="
echo "  OmniMonitor - Instalação Rápida"
echo "========================================="
echo ""

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 não encontrado. Por favor instale $1."
        exit 1
    fi
}

check_command python3
check_command pip3

echo "✅ Pré-requisitos encontrados"
echo ""

read -p "Tipo de instalação: (1) Dashboard, (2) Agent, (3) Ambos [3]: " install_type
install_type=${install_type:-3}

if [ "$install_type" = "1" ] || [ "$install_type" = "3" ]; then
    echo ""
    echo "📦 Instalando Dashboard..."
    echo ""
    
    DASHBOARD_DIR="omnimonitor-dashboard"
    
    if [ ! -d "$DASHBOARD_DIR" ]; then
        mkdir -p $DASHBOARD_DIR
        cd $DASHBOARD_DIR
        
        python3 -m venv venv
        source venv/bin/activate
        
        pip install --upgrade pip
        pip install -r requirements.txt
        
        python manage.py migrate --run-syncdb
        
        read -p "Criar superusuário? [y/N]: " create_superuser
        if [ "$create_superuser" = "y" ] || [ "$create_superuser" = "Y" ]; then
            python manage.py createsuperuser
        fi
        
        echo ""
        echo "✅ Dashboard instalado em $DASHBOARD_DIR"
        echo ""
        echo "Para iniciar o dashboard:"
        echo "  cd $DASHBOARD_DIR"
        echo "  source venv/bin/activate"
        echo "  daphne omnimonitor.asgi:application -b 0.0.0.0 -p 8000"
        echo ""
        
        cd ..
    else
        echo "⚠️  Dashboard já existe em $DASHBOARD_DIR"
    fi
fi

if [ "$install_type" = "2" ] || [ "$install_type" = "3" ]; then
    echo ""
    echo "📦 Instalando Agent..."
    echo ""
    
    AGENT_DIR="omnimonitor-agent"
    
    mkdir -p $AGENT_DIR
    cd $AGENT_DIR
    
    python3 -m venv venv
    source venv/bin/activate
    
    pip install --upgrade pip
    pip install -r requirements.txt
    
    chmod +x agent.py
    
    cd ..
    
    echo ""
    echo "✅ Agent instalado em $AGENT_DIR"
    echo ""
    
    if [ "$install_type" = "3" ]; then
        echo "Criando token de conexão..."
        
        cd $DASHBOARD_DIR
        source venv/bin/activate
        
        TOKEN=$(python -c "import secrets; print(secrets.token_urlsafe(48))")
        
        echo ""
        echo "📝 Token gerado: $TOKEN"
        echo ""
        echo "Para conectar o agent ao dashboard:"
        echo "  cd $AGENT_DIR"
        echo "  source venv/bin/activate"
        echo "  python agent.py --server http://DASHBOARD_IP:8000 --token $TOKEN"
        echo ""
        
        cd ..
    fi
fi

echo ""
echo "========================================="
echo "  Instalação concluída!"
echo "========================================="
echo ""
echo "📖 Documentação: https://github.com/omnimonitor/docs"
echo ""
