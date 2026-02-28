-- ========================================
-- AVADMIN - Migration 003: Register Fields
-- ========================================
-- Adiciona campos necessarios para o sistema de registro unificado

-- Adicionar campos na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS complement VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_street VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_state VARCHAR(2);

-- Criar indices para os novos campos
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_birth_date ON users(birth_date);

-- Adicionar campos na tabela accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS complement VARCHAR(100);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS billing_user_id UUID REFERENCES users(id);

-- Adicionar campos na tabela plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS module_slug VARCHAR(50) NOT NULL DEFAULT 'stocktech';

-- Criar indice para module_slug
CREATE INDEX IF NOT EXISTS idx_plans_module_slug ON plans(module_slug);

-- Inserir planos iniciais para StockTech (se nao existirem)
INSERT INTO plans (id, name, slug, description, price, billing_cycle, plan_type, max_users, max_products, max_transactions, features, is_popular, trial_days, module_slug)
SELECT gen_random_uuid(), 'Lojista', 'lojista', 'Para pequenos lojistas', 39.90, 'monthly', 'individual', 1, 150, 500,
       '{"modules": ["StockTech"], "whatsapp_integration": true, "api_access": false, "custom_branding": false, "priority_support": false}', false, 7, 'stocktech'
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE slug = 'lojista' AND module_slug = 'stocktech');

INSERT INTO plans (id, name, slug, description, price, billing_cycle, plan_type, max_users, max_products, max_transactions, features, is_popular, trial_days, module_slug)
SELECT gen_random_uuid(), 'Empresa', 'empresa', 'Para empresas em crescimento', 89.90, 'monthly', 'business', 5, 500, 2000,
       '{"modules": ["StockTech"], "whatsapp_integration": true, "api_access": true, "custom_branding": false, "priority_support": false}', true, 14, 'stocktech'
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE slug = 'empresa' AND module_slug = 'stocktech');

INSERT INTO plans (id, name, slug, description, price, billing_cycle, plan_type, max_users, max_products, max_transactions, features, is_popular, trial_days, module_slug)
SELECT gen_random_uuid(), 'Corporativo', 'corporativo', 'Para grandes corporacoes', 199.90, 'monthly', 'enterprise', 20, 99999, 99999,
       '{"modules": ["StockTech"], "whatsapp_integration": true, "api_access": true, "custom_branding": true, "priority_support": true}', false, 30, 'stocktech'
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE slug = 'corporativo' AND module_slug = 'stocktech');