#!/bin/bash

# Deploy AvelarMonitor para amo.avelarcompany.dev.br

set -e

echo "========================================="
echo "  Deploy AvelarMonitor"
echo "  Domínio: amo.avelarcompany.dev.br"
echo "  IP: 217.216.48.148"
echo "  Porta: 9999"
echo "========================================="
echo ""

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Por favor instale Docker."
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose não encontrado. Por favor instale Docker Compose."
    exit 1
fi

# Copiar .env configurado
if [ -f .env.amo ]; then
    echo "✅ Usando configuração pré-configurada para amo.avelarcompany.dev.br"
    cp .env.amo .env
else
    echo "⚠️  .env.amo não encontrado, criando a partir de .env.example"
    cp .env.example .env
    echo "⚠️  Por favor edite .env com suas credenciais"
    nano .env
fi

# Gerar SECRET_KEY se não definido
if grep -q "django-insecure-change-this" .env; then
    echo "🔑 Gerando novo SECRET_KEY..."
    SECRET_KEY=$(openssl rand -base64 32)
    sed -i "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" .env
fi

# Build containers
echo ""
echo "🔨 Building containers..."
docker compose build

# Subir containers
echo ""
echo "🚀 Starting containers..."
docker compose up -d

# Esperar containers estarem prontos
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Verificar status
echo ""
echo "📊 Checking service status..."
docker compose ps

# Executar migrations
echo ""
echo "📝 Running migrations..."
docker compose exec -T app python manage.py migrate --noinput || true

# Criar superusuário se não existir
echo ""
echo "👤 Creating superuser..."
docker compose exec -T app python manage.py shell <<EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='AvelarComp').exists():
    User.objects.create_superuser(
        username='AvelarComp',
        email='admin@avelarcompany.dev.br',
        password='@Acompany0605'
    )
    print("✅ Superusuário criado!")
else:
    print("ℹ️  Superusuário já existe")
EOF

# Criar token de agent
echo ""
echo "🔑 Creating agent token..."
docker compose exec -T app python manage.py shell <<EOF
from apps.multi.models import AgentToken
import secrets

# Verificar se já existe token
if not AgentToken.objects.filter(name='Agent-Master').exists():
    token = AgentToken.objects.create(name='Agent-Master')
    print(f"✅ Agent token criado:")
    print(f"   {token.token}")
else:
    token = AgentToken.objects.get(name='Agent-Master')
    print(f"ℹ️  Agent token existente:")
    print(f"   {token.token}")
EOF

# Coletar arquivos estáticos
echo ""
echo "📦 Collecting static files..."
docker compose exec -T app python manage.py collectstatic --noinput || true

echo ""
echo "========================================="
echo "  ✅ Deploy Concluído!"
echo "========================================="
echo ""
echo "📱 Acesse:"
echo "   Painel:        http://217.216.48.148:9999"
echo "   Painel:        https://amo.avelarcompany.dev.br"
echo "   Admin:         http://217.216.48.148:9999/admin"
echo "   Admin:         https://amo.avelarcompany.dev.br/admin"
echo ""
echo "👤 Credenciais:"
echo "   Usuário:      AvelarComp"
echo "   Senha:        @Acompany0605"
echo ""
echo "🔑 Agent Token:"
echo "   (veja acima no output)"
echo ""
echo "📊 Status:"
echo "   docker compose ps"
echo ""
echo "📝 Logs:"
echo "   docker compose logs -f app"
echo ""
echo "🛑 Parar:"
echo "   docker compose down"
echo ""
echo "🔄 Reiniciar:"
echo "   docker compose restart"
echo ""
