-- ========================================
-- AVELAR SYSTEM - AvAdmin Database Schema
-- ========================================
-- Schema de autenticação centralizada no schema 'avelar_admin'
-- Executar via: docker exec supabase-db psql -U postgres -f /migrations/001_avadmin_schema.sql

-- Definir search_path para o schema avelar_admin
SET search_path TO avelar_admin;

-- =======================================
-- EXTENSÕES NECESSÁRIAS (no schema public)
-- =======================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "unaccent" SCHEMA public;

-- =======================================
-- ENUMS (Tipos Customizados)
-- =======================================

DO $$ BEGIN
    CREATE TYPE account_status AS ENUM (
        'active',
        'suspended',
        'cancelled',
        'trial',
        'pending'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'super_admin',
        'admin',
        'manager',
        'user',
        'viewer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE client_type AS ENUM (
        'cliente',
        'lojista',
        'distribuidor'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE billing_cycle AS ENUM (
        'monthly',
        'yearly',
        'lifetime'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE plan_type AS ENUM (
        'individual',
        'business',
        'enterprise',
        'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM (
        'pending',
        'paid',
        'failed',
        'cancelled',
        'refunded',
        'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM (
        'credit_card',
        'debit_card',
        'pix',
        'boleto',
        'bank_transfer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE verification_code_type AS ENUM (
        'whatsapp_login',
        'password_reset',
        'email_verification',
        'phone_verification'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM (
        'CREATE',
        'UPDATE',
        'DELETE',
        'LOGIN',
        'LOGOUT',
        'PASSWORD_RESET',
        'MODULE_ENABLE',
        'MODULE_DISABLE',
        'PLAN_CHANGE',
        'BILLING_UPDATE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =======================================
-- TABELA: PLANS (Planos SaaS)
-- =======================================

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    billing_cycle billing_cycle DEFAULT 'monthly' NOT NULL,
    plan_type plan_type DEFAULT 'business' NOT NULL,
    max_users INTEGER DEFAULT 1 NOT NULL,
    max_products INTEGER DEFAULT 100 NOT NULL,
    max_transactions INTEGER DEFAULT 500 NOT NULL,
    max_storage_gb INTEGER DEFAULT 1 NOT NULL,
    features JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    is_popular BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    trial_days INTEGER DEFAULT 7,
    display_order INTEGER DEFAULT 0,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT plans_price_check CHECK (price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_plans_name ON plans(name);
CREATE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);

-- =======================================
-- TABELA: ACCOUNTS (Contas de Empresas)
-- =======================================

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(100) NOT NULL,
    cnpj VARCHAR(14) NOT NULL UNIQUE,
    responsible_name VARCHAR(100) NOT NULL,
    owner_cpf VARCHAR(11),  -- CPF do dono da empresa para multi-tenancy
    whatsapp VARCHAR(15) NOT NULL,
    whatsapp_verified BOOLEAN DEFAULT false,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(8),
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    status account_status DEFAULT 'trial' NOT NULL,
    client_type client_type DEFAULT 'cliente',
    enabled_modules JSONB DEFAULT '[]'::jsonb,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    billing_email VARCHAR(100),
    max_users INTEGER DEFAULT 1,
    max_products INTEGER DEFAULT 100,
    max_transactions INTEGER DEFAULT 500,
    current_users INTEGER DEFAULT 0,
    current_products INTEGER DEFAULT 0,
    current_transactions_month INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_company_name ON accounts(company_name);
CREATE INDEX IF NOT EXISTS idx_accounts_cnpj ON accounts(cnpj);
CREATE INDEX IF NOT EXISTS idx_accounts_owner_cpf ON accounts(owner_cpf);
CREATE INDEX IF NOT EXISTS idx_accounts_plan_id ON accounts(plan_id);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_client_type ON accounts(client_type);
CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON accounts(created_at DESC);

-- =======================================
-- TABELA: USERS (Usuários)
-- =======================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    cpf VARCHAR(11) NOT NULL UNIQUE,
    whatsapp VARCHAR(15) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    role user_role DEFAULT 'user' NOT NULL,
    is_active BOOLEAN DEFAULT true,
    whatsapp_verified BOOLEAN DEFAULT false,
    birth_date DATE,
    zip_code VARCHAR(8),
    address_number VARCHAR(20),
    reference_point TEXT,
    store_name VARCHAR(100),
    logo_url TEXT,
    facade_photo_url TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf);
CREATE INDEX IF NOT EXISTS idx_users_whatsapp ON users(whatsapp);
CREATE INDEX IF NOT EXISTS idx_users_account_id ON users(account_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- =======================================
-- TABELA: VERIFICATION_CODES
-- =======================================

CREATE TABLE IF NOT EXISTS verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    type verification_code_type NOT NULL,
    used BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

-- =======================================
-- TABELA: BILLING_TRANSACTIONS
-- =======================================

CREATE TABLE IF NOT EXISTS billing_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    status transaction_status DEFAULT 'pending' NOT NULL,
    payment_method payment_method,
    mercadopago_id VARCHAR(100),
    mercadopago_status VARCHAR(50),
    payment_gateway VARCHAR(50) DEFAULT 'mercadopago',
    pix_qr_code TEXT,
    boleto_url VARCHAR(500),
    payment_link VARCHAR(500),
    billing_period_start TIMESTAMP WITH TIME ZONE,
    billing_period_end TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    description TEXT,
    invoice_number VARCHAR(50),
    gateway_metadata JSONB DEFAULT '{}'::jsonb,
    customer_name VARCHAR(100),
    customer_email VARCHAR(100),
    customer_phone VARCHAR(15),
    customer_document VARCHAR(14),
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    discount_coupon VARCHAR(50),
    gateway_fee NUMERIC(10, 2) DEFAULT 0,
    net_amount NUMERIC(10, 2),
    is_trial_conversion BOOLEAN DEFAULT false,
    is_upgrade BOOLEAN DEFAULT false,
    is_renewal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT billing_transactions_amount_check CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_account_id ON billing_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_plan_id ON billing_transactions(plan_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_status ON billing_transactions(status);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_created_at ON billing_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_invoice_number ON billing_transactions(invoice_number);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_mercadopago_id ON billing_transactions(mercadopago_id);

-- =======================================
-- TABELA: AUDIT_LOGS
-- =======================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(50),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    endpoint VARCHAR(200),
    description TEXT,
    is_suspicious BOOLEAN DEFAULT false,
    is_admin_action BOOLEAN DEFAULT false,
    extra_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_account_id ON audit_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);

-- =======================================
-- TABELA: GLOBAL_SETTINGS
-- =======================================

CREATE TABLE IF NOT EXISTS global_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    is_secret BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_global_settings_setting_key ON global_settings(setting_key);

-- =======================================
-- FUNÇÃO: Update Updated_At
-- =======================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS trigger_plans_updated_at ON plans;
CREATE TRIGGER trigger_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_accounts_updated_at ON accounts;
CREATE TRIGGER trigger_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_billing_transactions_updated_at ON billing_transactions;
CREATE TRIGGER trigger_billing_transactions_updated_at
    BEFORE UPDATE ON billing_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_global_settings_updated_at ON global_settings;
CREATE TRIGGER trigger_global_settings_updated_at
    BEFORE UPDATE ON global_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =======================================
-- DADOS INICIAIS
-- =======================================

-- Planos padrão (inserir apenas se não existirem)
INSERT INTO plans (name, slug, description, price, billing_cycle, plan_type, max_users, max_products, max_transactions, features, is_popular, trial_days)
SELECT 'Lojista', 'lojista', 'Para pequenos lojistas', 39.90, 'monthly', 'individual', 1, 150, 500,
       '{"modules": ["StockTech"], "whatsapp_integration": true, "api_access": false, "custom_branding": false, "priority_support": false}', false, 7
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE slug = 'lojista');

INSERT INTO plans (name, slug, description, price, billing_cycle, plan_type, max_users, max_products, max_transactions, features, is_popular, trial_days)
SELECT 'Empresa', 'empresa', 'Para empresas em crescimento', 89.90, 'monthly', 'business', 5, 500, 2000,
       '{"modules": ["StockTech", "Lucrum"], "whatsapp_integration": true, "api_access": true, "custom_branding": false, "priority_support": false}', true, 14
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE slug = 'empresa');

INSERT INTO plans (name, slug, description, price, billing_cycle, plan_type, max_users, max_products, max_transactions, features, is_popular, trial_days)
SELECT 'Corporativo', 'corporativo', 'Para grandes corporações', 199.90, 'monthly', 'enterprise', 20, 99999, 99999,
       '{"modules": ["StockTech", "Lucrum", "NaldoGas"], "whatsapp_integration": true, "api_access": true, "custom_branding": true, "priority_support": true}', false, 30
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE slug = 'corporativo');

-- Super Admin (Avelar Company)
INSERT INTO accounts (company_name, cnpj, responsible_name, whatsapp, status, client_type, enabled_modules)
SELECT 'Avelar Company', '00000000000191', 'Administrador', '+5511999999999', 'active', 'distribuidor', '["AvAdmin", "StockTech", "Lucrum", "NaldoGas"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE cnpj = '00000000000191');

-- Super Admin User (senha: admin123 - bcrypt hash)
INSERT INTO users (full_name, cpf, whatsapp, password_hash, account_id, role, is_active, whatsapp_verified, store_name)
SELECT 'Administrador do Sistema', '00000000000', '+5511999999999', 
       '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKF4n3n6hOcGBD5O',
       (SELECT id FROM accounts WHERE cnpj = '00000000000191'), 'super_admin', true, true, 'Avelar Company'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE cpf = '00000000000');

-- Empresa Demo
INSERT INTO accounts (company_name, cnpj, responsible_name, whatsapp, status, client_type, enabled_modules, trial_ends_at)
SELECT 'Empresa Demo LTDA', '12345678000100', 'João Silva Santos', '+5511988888888', 'trial', 'lojista', '["StockTech"]'::jsonb,
       NOW() + INTERVAL '30 days'
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE cnpj = '12345678000100');

-- Demo User (senha: demo123 - bcrypt hash)
INSERT INTO users (full_name, cpf, whatsapp, password_hash, account_id, role, is_active, whatsapp_verified, store_name)
SELECT 'João Silva Santos', '12345678900', '+5511988888888', 
       '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKF4n3n6hOcGBD5O',
       (SELECT id FROM accounts WHERE cnpj = '12345678000100'), 'admin', true, true, 'Empresa Demo'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE cpf = '12345678900');

-- =======================================
-- FINALIZAÇÃO
-- =======================================

DO $$
BEGIN
    RAISE NOTICE '🚀 AvAdmin Schema criado com sucesso no schema avelar_admin!';
    RAISE NOTICE '📊 Tabelas: plans, accounts, users, verification_codes, billing_transactions, audit_logs, global_settings';
    RAISE NOTICE '👑 Super Admin: CPF 00000000000, Senha: admin123';
    RAISE NOTICE '🏪 Demo User: CPF 12345678900, Senha: demo123';
END $$;


