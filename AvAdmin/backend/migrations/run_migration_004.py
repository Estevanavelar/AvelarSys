#!/usr/bin/env python3
"""
Script para executar a migration 004 no banco Neon
Adiciona o campo owner_cpf na tabela accounts
"""

import os
import sys
from pathlib import Path

# Adicionar o path do projeto
sys.path.insert(0, str(Path(__file__).parent.parent))

import psycopg2
from dotenv import load_dotenv

# Carregar .env
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

# URL do banco Neon (asyncpg -> psycopg2 format)
DATABASE_URL = os.getenv(
    'AVADMIN_DATABASE_URL',
    'postgresql://neondb_owner:npg_pY5C0lHhARfx@ep-muddy-bread-acs8josc-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
)

# Converter para formato psycopg2 se necessário
DATABASE_URL = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
DATABASE_URL = DATABASE_URL.replace('ssl=require', 'sslmode=require')

def run_migration():
    """Executa a migration 004"""
    
    migration_file = Path(__file__).parent / '004_add_owner_cpf_to_accounts.sql'
    
    if not migration_file.exists():
        print(f"❌ Arquivo de migration não encontrado: {migration_file}")
        return False
    
    print(f"🔗 Conectando ao banco Neon...")
    print(f"📄 Migration: {migration_file.name}")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Ler e executar a migration
        with open(migration_file, 'r') as f:
            sql = f.read()
        
        print("⚙️  Executando migration...")
        cursor.execute(sql)
        
        # Verificar se a coluna foi criada
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'accounts' AND column_name = 'owner_cpf'
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"✅ Coluna owner_cpf criada com sucesso!")
            print(f"   - Tipo: {result[1]}")
            print(f"   - Nullable: {result[2]}")
        else:
            print("⚠️  Coluna owner_cpf não encontrada (pode já existir)")
        
        # Mostrar estrutura atual da tabela accounts
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'accounts'
            ORDER BY ordinal_position
        """)
        
        print("\n📊 Estrutura atual da tabela accounts:")
        for row in cursor.fetchall():
            print(f"   - {row[0]}: {row[1]}")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 Migration 004 executada com sucesso!")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao executar migration: {e}")
        return False

if __name__ == '__main__':
    success = run_migration()
    sys.exit(0 if success else 1)
