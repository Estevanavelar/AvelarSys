#!/bin/bash

# ========================================
# AVELAR SYSTEM - Setup Supabase Databases
# ========================================
# Script para configurar bancos Supabase para AvAdmin e StockTech
# Execute: ./scripts/setup-supabase-databases.sh

set -e

echo "🚀 Configurando bancos Supabase para Avelar System..."
echo ""

# ========================================
# FUNÇÕES AUXILIARES
# ========================================

check_psql() {
    if ! command -v psql &> /dev/null; then
        echo "❌ PostgreSQL client não encontrado. Instale com:"
        echo "   Ubuntu/Debian: sudo apt install postgresql-client"
        echo "   macOS: brew install postgresql"
        echo "   Ou use Docker: docker run -it --rm postgres:15 psql"
        exit 1
    fi
}

create_database() {
    local db_name=$1
    local db_url=$2

    echo "📦 Criando banco: $db_name"

    # Extrair componentes da URL
    local host=$(echo $db_url | sed -n 's|.*@\([^:]*\):.*|\1|p')
    local port=$(echo $db_url | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
    local user=$(echo $db_url | sed -n 's|.*://\([^:]*\):.*|\1|p')
    local password=$(echo $db_url | sed -n 's|.*:\([^@]*\)@.*|\1|p')
    local database=$(echo $db_url | sed -n 's|.*/\([^?]*\).*|\1|p')

    echo "   Host: $host:$port"
    echo "   User: $user"
    echo "   Database: $database"

    # Testar conexão
    if PGPASSWORD=$password psql -h $host -p $port -U $user -d postgres -c "SELECT 1;" &> /dev/null; then
        echo "   ✅ Conexão OK"

        # Criar banco se não existir
        PGPASSWORD=$password psql -h $host -p $port -U $user -d postgres -c "CREATE DATABASE $database;" 2>/dev/null && \
        echo "   ✅ Banco criado: $database" || \
        echo "   ⚠️  Banco já existe: $database"

    else
        echo "   ❌ Falha na conexão com Supabase"
        echo "   Verifique as credenciais no arquivo .env"
        return 1
    fi

    echo ""
}

apply_migration() {
    local db_name=$1
    local db_url=$2
    local migration_file=$3

    echo "🔄 Aplicando migração: $db_name"

    if [ ! -f "$migration_file" ]; then
        echo "   ❌ Arquivo de migração não encontrado: $migration_file"
        return 1
    fi

    # Aplicar migração usando psql
    if PGPASSWORD=$(echo $db_url | sed -n 's|.*:\([^@]*\)@.*|\1|p') \
       psql "$db_url" -f "$migration_file" --quiet; then
        echo "   ✅ Migração aplicada com sucesso"
    else
        echo "   ❌ Falha ao aplicar migração"
        return 1
    fi

    echo ""
}

# ========================================
# VERIFICAÇÕES PRÉVIAS
# ========================================

echo "🔍 Verificações iniciais..."

# Verificar se arquivo .env existe
if [ ! -f ".env" ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "   Copie env.example para .env e configure:"
    echo "   cp env.example .env"
    echo ""
    exit 1
fi

# Carregar variáveis do .env
set -a
source .env
set +a

# Verificar psql
check_psql

echo "✅ Verificações OK"
echo ""

# ========================================
# CRIAR BANCOS
# ========================================

echo "🏗️  Criando bancos de dados..."

# AvAdmin Database
if [ -n "$AVADMIN_DATABASE_URL" ]; then
    create_database "AvAdmin" "$AVADMIN_DATABASE_URL"
else
    echo "❌ AVADMIN_DATABASE_URL não definida no .env"
    exit 1
fi

# StockTech Database
if [ -n "$STOCKTECH_DATABASE_URL" ]; then
    create_database "StockTech" "$STOCKTECH_DATABASE_URL"
else
    echo "❌ STOCKTECH_DATABASE_URL não definida no .env"
    exit 1
fi

# ========================================
# APLICAR MIGRAÇÕES
# ========================================

echo "📋 Aplicando migrações..."

# Migração AvAdmin
avadmin_migration="AvAdmin/backend/migrations/001_initial_schema.sql"
apply_migration "AvAdmin" "$AVADMIN_DATABASE_URL" "$avadmin_migration"

# Migração StockTech
stocktech_migration="StockTech/drizzle/migrations/001_add_multi_tenant_fields.sql"
apply_migration "StockTech" "$STOCKTECH_DATABASE_URL" "$stocktech_migration"

# ========================================
# VERIFICAÇÃO FINAL
# ========================================

echo "🎯 Verificação final..."

# Verificar tabelas AvAdmin
echo "📊 Verificando tabelas AvAdmin..."
PGPASSWORD=$(echo $AVADMIN_DATABASE_URL | sed -n 's|.*:\([^@]*\)@.*|\1|p') \
psql "$AVADMIN_DATABASE_URL" -c "\dt" --quiet

# Verificar tabelas StockTech
echo ""
echo "📊 Verificando tabelas StockTech..."
PGPASSWORD=$(echo $STOCKTECH_DATABASE_URL | sed -n 's|.*:\([^@]*\)@.*|\1|p') \
psql "$STOCKTECH_DATABASE_URL" -c "\dt" --quiet

# ========================================
# FINALIZAÇÃO
# ========================================

echo ""
echo "🎉 Setup completo!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Execute: cp env.example .env (se ainda não fez)"
echo "   2. Configure as variáveis no .env"
echo "   3. Inicie o AvAdmin: cd AvAdmin/backend && python main.py"
echo "   4. Inicie o StockTech: cd StockTech && pnpm dev"
echo ""
echo "🔐 Credenciais de teste:"
echo "   Super Admin: CPF 00000000000 / Senha: admin123"
echo "   Empresa Demo: CNPJ 12345678000100 / CPF 12345678900 / Senha: user123"
echo ""
echo "🚀 Avelar System está pronto para desenvolvimento!"

