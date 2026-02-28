#!/usr/bin/env python3
# ========================================
# Script para fazer reset do banco Neon
# CUIDADO: Este script apaga TODAS as tabelas!
# ========================================

import sys
from sqlalchemy import create_engine, text

# Neon connection
engine = create_engine(
    'postgresql://neondb_owner:npg_pY5C0lHhARfx@ep-muddy-bread-acs8josc-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
)

def reset_database():
    """Reset complete database - DELETE ALL TABLES"""
    
    print("⚠️  AVISO: Este script vai DELETAR TODAS as tabelas do banco Neon!")
    print("   Isso inclui todos os dados existentes.")
    print("   Use apenas em desenvolvimento!")
    print()
    
    response = input("Digite 'RESET' para confirmar: ")
    if response != "RESET":
        print("❌ Operação cancelada.")
        sys.exit(1)
    
    try:
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()
            
            try:
                print("🗑️  Deletando todas as tabelas...")
                
                # Drop all tables in correct order (respecting FK constraints)
                tables_to_drop = [
                    'billing_transactions', 'users', 'accounts', 'plans',
                    'verification_codes', 'system_logs', 'account_modules',
                    'global_products', 'global_categories', 'global_brands',
                    'transactions', 'subscriptions', 'monthly_payments',
                    'payments', 'modules', 'global_settings', '_prisma_migrations',
                    'alembic_version'
                ]
                
                # Drop all tables with CASCADE to handle FK constraints
                for table in tables_to_drop:
                    try:
                        conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE;"))
                        print(f"  ✅ Tabela {table} deletada")
                    except Exception as e:
                        print(f"  ⚠️  Tabela {table}: {str(e)[:100]}")
                
                # Drop all custom types that might exist (including new ones)
                try:
                    types_to_drop = [
                        "accountstatus", "userrole", "billingcycle", "plantype", 
                        "transactionstatus", "paymentmethod", "auditaction"
                    ]
                    
                    for type_name in types_to_drop:
                        conn.execute(text(f"DROP TYPE IF EXISTS {type_name} CASCADE;"))
                    
                    print("  ✅ Types customizados deletados")
                except Exception as e:
                    print(f"  ⚠️  Types: {str(e)[:100]}")
                
                # Commit transaction
                trans.commit()
                
                print("\n✅ Reset concluído com sucesso!")
                print("💡 Agora você pode executar as migrations:")
                print("   alembic upgrade head")
                
            except Exception as e:
                trans.rollback()
                print(f"❌ Erro durante reset: {e}")
                raise
                
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")
        sys.exit(1)

if __name__ == "__main__":
    reset_database()