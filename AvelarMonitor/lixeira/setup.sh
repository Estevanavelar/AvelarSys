#!/bin/bash

# Script de instalação do Painel de Controle Django

set -e

echo "🚀 Instalando Painel de Controle Django - AvelarSys"
echo ""

# Verificar se pip está instalado
if ! command -v pip3 &> /dev/null; then
    echo "📦 Instalando pip3..."
    sudo apt update
    sudo apt install -y python3-pip
fi

# Instalar dependências
echo "📦 Instalando dependências Python..."
pip3 install -r requirements.txt

# Executar migrações
echo "🗄️  Executando migrações do banco de dados..."
python3 manage.py migrate --noinput

# Criar superusuário
echo "👤 Criando superusuário..."
python3 manage.py shell << 'EOF'
from django.contrib.auth import get_user_model
User = get_user_model()
if User.objects.filter(username='AvelarComp').exists():
    print("Usuário AvelarComp já existe. Removendo...")
    User.objects.filter(username='AvelarComp').delete()
User.objects.create_superuser('AvelarComp', 'admin@avelarcompany.com.br', '@Acompany0605')
print("✅ Superusuário 'AvelarComp' criado com sucesso!")
EOF

# Coletar arquivos estáticos
echo "📁 Coletando arquivos estáticos..."
python3 manage.py collectstatic --noinput

# Verificar configuração
echo "✅ Verificando configuração..."
python3 manage.py check

echo ""
echo "✅ Instalação concluída!"
echo ""
echo "Para iniciar o servidor, execute:"
echo "  cd /home/avelar/AvelarSys/painel"
echo "  python3 manage.py runserver 0.0.0.0:8000"
echo ""
echo "Acesse: http://localhost:8000"
echo "Usuário: AvelarComp"
echo "Senha: @Acompany0605"

