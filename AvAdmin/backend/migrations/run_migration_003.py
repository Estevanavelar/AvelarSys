#!/usr/bin/env python3
"""
Migration 003: Register Fields
Executa migration para adicionar campos de registro unificado
"""

import asyncio
from app.core.database import engine
from sqlalchemy import text

async def run_migration():
    try:
        print("🚀 Iniciando Migration 003: Register Fields")

        async with engine.begin() as conn:
            # Schema correto
            await conn.execute(text("SET search_path TO avelar_admin, public"))
            print("✅ Schema definido")

            # Campos na tabela users
            print("📝 Adicionando campos na tabela users...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100);"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS complement VARCHAR(100);"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS address_street VARCHAR(200);"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS address_city VARCHAR(100);"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS address_state VARCHAR(2);"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS address_number VARCHAR(20);"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS address_neighborhood VARCHAR(100);"))

            # Índices para users
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_birth_date ON users(birth_date);"))
            print("✅ Campos users adicionados")

            # Campos na tabela accounts
            print("🏢 Adicionando campos na tabela accounts...")
            await conn.execute(text("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS complement VARCHAR(100);"))
            await conn.execute(text("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS billing_user_id UUID REFERENCES users(id);"))
            print("✅ Campos accounts adicionados")

            # Campos na tabela plans
            print("📋 Adicionando campos na tabela plans...")
            await conn.execute(text("ALTER TABLE plans ADD COLUMN IF NOT EXISTS module_slug VARCHAR(50) NOT NULL DEFAULT 'stocktech';"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_plans_module_slug ON plans(module_slug);"))
            print("✅ Campos plans adicionados")

            # Planos do StockTech
            print("🏪 Inserindo planos do StockTech...")

            # Lojista
            await conn.execute(text("""
                INSERT INTO plans (id, name, slug, description, price, billing_cycle, plan_type, max_users, max_products, max_transactions, features, is_popular, trial_days, module_slug)
                SELECT gen_random_uuid(), 'Lojista', 'lojista', 'Para pequenos lojistas', 39.90, 'monthly', 'individual', 1, 150, 500,
                       '{"modules": ["StockTech"], "whatsapp_integration": true, "api_access": false, "custom_branding": false, "priority_support": false}', false, 7, 'stocktech'
                WHERE NOT EXISTS (SELECT 1 FROM plans WHERE slug = 'lojista' AND module_slug = 'stocktech');
            """))

            # Empresa
            await conn.execute(text("""
                INSERT INTO plans (id, name, slug, description, price, billing_cycle, plan_type, max_users, max_products, max_transactions, features, is_popular, trial_days, module_slug)
                SELECT gen_random_uuid(), 'Empresa', 'empresa', 'Para empresas em crescimento', 89.90, 'monthly', 'business', 5, 500, 2000,
                       '{"modules": ["StockTech"], "whatsapp_integration": true, "api_access": true, "custom_branding": false, "priority_support": false}', true, 14, 'stocktech'
                WHERE NOT EXISTS (SELECT 1 FROM plans WHERE slug = 'empresa' AND module_slug = 'stocktech');
            """))

            # Corporativo
            await conn.execute(text("""
                INSERT INTO plans (id, name, slug, description, price, billing_cycle, plan_type, max_users, max_products, max_transactions, features, is_popular, trial_days, module_slug)
                SELECT gen_random_uuid(), 'Corporativo', 'corporativo', 'Para grandes corporacoes', 199.90, 'monthly', 'enterprise', 20, 99999, 99999,
                       '{"modules": ["StockTech"], "whatsapp_integration": true, "api_access": true, "custom_branding": true, "priority_support": true}', false, 30, 'stocktech'
                WHERE NOT EXISTS (SELECT 1 FROM plans WHERE slug = 'corporativo' AND module_slug = 'stocktech');
            """))

            print("✅ Planos StockTech inseridos")

        print("🎉 Migration 003 executada com sucesso!")
        print("📊 Novos campos adicionados:")
        print("   • Users: email, complement, birth_date, address_*")
        print("   • Accounts: complement, billing_user_id")
        print("   • Plans: module_slug + planos StockTech")

    except Exception as e:
        print(f"❌ Erro na migration: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(run_migration())