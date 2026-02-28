#!/bin/bash

# Script para corrigir permissões do Docker no AvelarMonitor

echo "🔧 Corrigindo permissões do Docker para o AvelarMonitor"
echo ""

# Verificar se o usuário está no grupo docker
CURRENT_USER=$(whoami)
if groups | grep -q docker; then
    echo "✅ Usuário $CURRENT_USER já está no grupo docker"
else
    echo "⚠️  Usuário $CURRENT_USER NÃO está no grupo docker"
    echo ""
    echo "📝 Adicionando usuário ao grupo docker..."
    sudo usermod -aG docker $CURRENT_USER
    echo "✅ Usuário adicionado ao grupo docker"
    echo ""
    echo "⚠️  IMPORTANTE: Você precisa fazer logout e login novamente,"
    echo "   ou executar: newgrp docker"
    echo ""
fi

# Verificar permissões do socket
if [ -e /var/run/docker.sock ]; then
    SOCKET_PERMS=$(stat -c "%a %U:%G" /var/run/docker.sock)
    echo "📊 Permissões do socket Docker: $SOCKET_PERMS"
    
    if stat -c "%G" /var/run/docker.sock | grep -q docker; then
        echo "✅ Socket pertence ao grupo docker"
    else
        echo "⚠️  Socket não pertence ao grupo docker"
    fi
else
    echo "❌ Socket Docker não encontrado em /var/run/docker.sock"
    echo "   Verifique se o Docker está instalado e rodando"
fi

echo ""
echo "🔄 Para aplicar as mudanças:"
echo "   1. Execute: newgrp docker"
echo "   2. Ou faça logout/login"
echo "   3. Reinicie o servidor Django:"
echo "      cd $(pwd) && ./stop-production.sh && ./start-production.sh"
echo ""
