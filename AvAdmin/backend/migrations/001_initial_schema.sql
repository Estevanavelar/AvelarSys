-- ========================================
-- AVELAR SYSTEM - AvAdmin Database Schema
-- ========================================
-- Schema inicial do banco AvAdmin (autenticação centralizada)
-- Criado em: Janeiro 2026

-- =======================================
-- EXTENSÕES NECESSÁRIAS
-- =======================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =======================================
-- ENUMS (Tipos Customizados)
-- =======================================

CREATE TYPE account_status AS ENUM (
    'active',
    'suspended',
    'cancelled',
    'trial',
    'pending'
);

CREATE TYPE user_role AS ENUM (
    'super_admin',      -- Administrador do SaaS (Avelar Company)
    'admin',            -- Administrador da conta/empresa
    'manager',          -- Gerente (lojista)
    'user',             -- Usuário comum
    'viewer'            -- Apenas visualização
);

CREATE TYPE client_type AS ENUM (
    'cliente',          -- Cliente final (B2C)
    'lojista',          -- Loja/comerciante (B2B)
    'distribuidor'      -- Distribuidor/fornecedor (B2B)
);

CREATE TYPE billing_cycle AS ENUM (
    'monthly',
    'yearly',
    'lifetime'
);

CREATE TYPE plan_type AS ENUM (
    'individual',
    'business',
    'enterprise',
    'custom'
);

CREATE TYPE transaction_status AS ENUM (
    'pending',
    'paid',
    'failed',
    'cancelled',
    'refunded',
    'expired'
);

CREATE TYPE payment_method AS ENUM (
    'credit_card',
    'debit_card',
    'pix',
    'boleto',
    'bank_transfer'
);

CREATE TYPE verification_code_type AS ENUM (
    'whatsapp_login',
    'password_reset',
    'email_verification',
    'phone_verification'
);

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

-- =======================================
-- TABELA: PLANS (Planos SaaS)
-- =======================================

CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Informações básicas
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,

    -- Preço
    price NUMERIC(10, 2) NOT NULL,
    billing_cycle billing_cycle DEFAULT 'monthly' NOT NULL,
    plan_type plan_type DEFAULT 'business' NOT NULL,

    -- Limites de uso
    max_users VARCHAR DEFAULT '1' NOT NULL,           -- Máximo de usuários
    max_products VARCHAR DEFAULT '100' NOT NULL,      -- Máximo de produtos
    max_transactions VARCHAR DEFAULT '500' NOT NULL,  -- Transações/mês
    max_storage_gb VARCHAR DEFAULT '1' NOT NULL,

    -- Features (JSON)
    features JSONB DEFAULT '{}'::jsonb,

    -- Configuração
    is_active BOOLEAN DEFAULT true,
    is_popular BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    trial_days VARCHAR DEFAULT '7',
    display_order VARCHAR DEFAULT '0',
    color VARCHAR(7) DEFAULT '#3B82F6',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Índices
    CONSTRAINT plans_price_check CHECK (price >= 0)
);

CREATE INDEX idx_plans_name ON plans(name);
CREATE INDEX idx_plans_slug ON plans(slug);
CREATE INDEX idx_plans_is_active ON plans(is_active);

-- =======================================
-- TABELA: ACCOUNTS (Contas de Empresas)
-- =======================================

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Informações da empresa
    company_name VARCHAR(100) NOT NULL,
    cnpj VARCHAR(14) NOT NULL UNIQUE,
    responsible_name VARCHAR(100) NOT NULL,

    -- Contato (WhatsApp-First)
    whatsapp VARCHAR(15) NOT NULL,
    whatsapp_verified BOOLEAN DEFAULT false,

    -- Localização
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(8),

    -- SaaS Configuration
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    status account_status DEFAULT 'trial' NOT NULL,
    client_type client_type DEFAULT 'cliente',

    -- Módulos habilitados
    enabled_modules JSONB DEFAULT '[]'::jsonb,  -- Ex: ["StockTech", "Lucrum"]

    -- Trial e Billing
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    billing_email VARCHAR(100),

    -- Limites de uso (cópia do plano + customizações)
    max_users VARCHAR DEFAULT '1',
    max_products VARCHAR DEFAULT '100',
    max_transactions VARCHAR DEFAULT '500',

    -- Contadores de uso
    current_users VARCHAR DEFAULT '0',
    current_products VARCHAR DEFAULT '0',
    current_transactions_month VARCHAR DEFAULT '0',

    -- Configurações customizadas
    settings JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Índices
    CONSTRAINT accounts_cnpj_check CHECK (cnpj ~ '^\d{14}$'),
    CONSTRAINT accounts_whatsapp_check CHECK (whatsapp ~ '^\+55\d{10,11}$')
);

CREATE INDEX idx_accounts_company_name ON accounts(company_name);
CREATE INDEX idx_accounts_cnpj ON accounts(cnpj);
CREATE INDEX idx_accounts_plan_id ON accounts(plan_id);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_accounts_client_type ON accounts(client_type);
CREATE INDEX idx_accounts_created_at ON accounts(created_at DESC);

-- =======================================
-- TABELA: USERS (Usuários)
-- =======================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Autenticação (WhatsApp-First)
    full_name VARCHAR(100) NOT NULL,
    cpf VARCHAR(11) NOT NULL UNIQUE,  -- Login principal
    whatsapp VARCHAR(15) NOT NULL,     -- +5511999999999
    password_hash VARCHAR(255) NOT NULL,

    -- Conta/Empresa
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,

    -- Role e Status
    role user_role DEFAULT 'user' NOT NULL,
    is_active BOOLEAN DEFAULT true,

    -- Verificação WhatsApp
    whatsapp_verified BOOLEAN DEFAULT false,

    -- Dados adicionais
    birth_date DATE,
    zip_code VARCHAR(8),
    address_number VARCHAR(20),
    reference_point TEXT,
    store_name VARCHAR(100),
    logo_url TEXT,
    facade_photo_url TEXT,

    -- Rastreamento de login
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Índices
    CONSTRAINT users_cpf_check CHECK (cpf ~ '^\d{11}$'),
    CONSTRAINT users_whatsapp_check CHECK (whatsapp ~ '^\+55\d{10,11}$')
);

CREATE INDEX idx_users_cpf ON users(cpf);
CREATE INDEX idx_users_whatsapp ON users(whatsapp);
CREATE INDEX idx_users_account_id ON users(account_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- =======================================
-- TABELA: VERIFICATION_CODES
-- =======================================

CREATE TABLE verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    type verification_code_type NOT NULL,

    used BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT verification_codes_code_check CHECK (code ~ '^\d{6}$')
);

CREATE INDEX idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX idx_verification_codes_code ON verification_codes(code);
CREATE INDEX idx_verification_codes_expires_at ON verification_codes(expires_at);

-- =======================================
-- TABELA: BILLING_TRANSACTIONS
-- =======================================

CREATE TABLE billing_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,

    -- Detalhes da transação
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    status transaction_status DEFAULT 'pending' NOT NULL,
    payment_method payment_method,

    -- Gateway de pagamento (MercadoPago)
    mercadopago_id VARCHAR(100),
    mercadopago_status VARCHAR(50),
    payment_gateway VARCHAR(50) DEFAULT 'mercadopago',

    -- Detalhes de pagamento
    pix_qr_code TEXT,
    boleto_url VARCHAR(500),
    payment_link VARCHAR(500),

    -- Período de cobrança
    billing_period_start TIMESTAMP WITH TIME ZONE,
    billing_period_end TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    paid_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,

    -- Descrição e invoice
    description TEXT,
    invoice_number VARCHAR(50),

    -- Metadata do gateway
    gateway_metadata JSONB DEFAULT '{}'::jsonb,

    -- Dados do cliente (snapshot)
    customer_name VARCHAR(100),
    customer_email VARCHAR(100),
    customer_phone VARCHAR(15),
    customer_document VARCHAR(14),

    -- Descontos e taxas
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    discount_coupon VARCHAR(50),
    gateway_fee NUMERIC(10, 2) DEFAULT 0,
    net_amount NUMERIC(10, 2),

    -- Flags
    is_trial_conversion BOOLEAN DEFAULT false,
    is_upgrade BOOLEAN DEFAULT false,
    is_renewal BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT billing_transactions_amount_check CHECK (amount >= 0)
);

CREATE INDEX idx_billing_transactions_account_id ON billing_transactions(account_id);
CREATE INDEX idx_billing_transactions_plan_id ON billing_transactions(plan_id);
CREATE INDEX idx_billing_transactions_status ON billing_transactions(status);
CREATE INDEX idx_billing_transactions_created_at ON billing_transactions(created_at DESC);
CREATE INDEX idx_billing_transactions_invoice_number ON billing_transactions(invoice_number);
CREATE INDEX idx_billing_transactions_mercadopago_id ON billing_transactions(mercadopago_id);

-- =======================================
-- TABELA: AUDIT_LOGS
-- =======================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,

    -- Ação realizada
    action audit_action NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(50),

    -- Dados antes e depois
    old_values JSONB,
    new_values JSONB,

    -- Contexto da requisição
    ip_address VARCHAR(45),
    user_agent TEXT,
    endpoint VARCHAR(200),
    description TEXT,

    -- Flags de segurança
    is_suspicious BOOLEAN DEFAULT false,
    is_admin_action BOOLEAN DEFAULT false,
    extra_data JSONB DEFAULT '{}'::jsonb,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_account_id ON audit_logs(account_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);

-- =======================================
-- TABELA: GLOBAL_SETTINGS
-- =======================================

CREATE TABLE global_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB DEFAULT '{}'::jsonb,
    description TEXT,

    is_system BOOLEAN DEFAULT false,  -- Sistema não permite deletar
    is_secret BOOLEAN DEFAULT false,  -- Não exibe em logs

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_global_settings_setting_key ON global_settings(setting_key);

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
CREATE TRIGGER trigger_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_billing_transactions_updated_at
    BEFORE UPDATE ON billing_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_global_settings_updated_at
    BEFORE UPDATE ON global_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =======================================
-- PERMISSÕES E SEGURANÇA
-- =======================================

-- Criar role para aplicação
CREATE ROLE avelar_app WITH LOGIN PASSWORD 'secure_password_here';
GRANT CONNECT ON DATABASE avelar_admin TO avelar_app;
GRANT USAGE ON SCHEMA public TO avelar_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO avelar_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO avelar_app;

-- Criar role somente leitura
CREATE ROLE avelar_readonly WITH LOGIN PASSWORD 'readonly_password_here';
GRANT CONNECT ON DATABASE avelar_admin TO avelar_readonly;
GRANT USAGE ON SCHEMA public TO avelar_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO avelar_readonly;

-- =======================================
-- DADOS INICIAIS
-- =======================================

-- Planos padrão
INSERT INTO plans (name, slug, description, price, billing_cycle, plan_type, max_users, max_products, max_transactions, features, is_popular, trial_days)
VALUES
    ('Lojista', 'lojista', 'Para pequenos lojistas', 39.90, 'monthly', 'individual', '1', '150', '500',
     '{"modules": ["StockTech"], "whatsapp_integration": true, "api_access": false, "custom_branding": false, "priority_support": false}', false, '7'),

    ('Empresa', 'empresa', 'Para empresas em crescimento', 89.90, 'monthly', 'business', '5', '500', '2000',
     '{"modules": ["StockTech", "Lucrum"], "whatsapp_integration": true, "api_access": true, "custom_branding": false, "priority_support": false}', true, '14'),

    ('Corporativo', 'corporativo', 'Para grandes corporações', 199.90, 'monthly', 'enterprise', '20', 'unlimited', 'unlimited',
     '{"modules": ["StockTech", "Lucrum", "NaldoGas"], "whatsapp_integration": true, "api_access": true, "custom_branding": true, "priority_support": true}', false, '30');

-- Super Admin (desenvolvimento)
INSERT INTO accounts (company_name, cnpj, responsible_name, whatsapp, status, client_type, enabled_modules)
VALUES ('Avelar Company', '00000000000191', 'Administrador', '+5511999999999', 'active', 'distribuidor', '["AvAdmin", "StockTech", "Lucrum", "NaldoGas"]');

INSERT INTO users (full_name, cpf, whatsapp, password_hash, account_id, role, is_active, whatsapp_verified, store_name)
VALUES ('Administrador do Sistema', '00000000000', '+5511999999999', '$2b$12$...', -- Senha será definida no código
        (SELECT id FROM accounts WHERE cnpj = '00000000000191'), 'super_admin', true, true, 'Avelar Company');

-- Empresa Demo
INSERT INTO accounts (company_name, cnpj, responsible_name, whatsapp, status, client_type, enabled_modules, trial_ends_at)
VALUES ('Empresa Demo LTDA', '12345678000100', 'João Silva Santos', '+5511999999999', 'trial', 'lojista', '["StockTech"]',
        NOW() + INTERVAL '30 days');

INSERT INTO users (full_name, cpf, whatsapp, password_hash, account_id, role, is_active, whatsapp_verified, store_name)
VALUES ('João Silva Santos', '12345678900', '+5511999999999', '$2b$12$...', -- Senha será definida no código
        (SELECT id FROM accounts WHERE cnpj = '12345678000100'), 'admin', true, true, 'Empresa Demo');

-- =======================================
-- FINALIZAÇÃO
-- =======================================

DO $$
BEGIN
    RAISE NOTICE '🚀 AvAdmin Database criado com sucesso!';
    RAISE NOTICE '📊 Tabelas criadas: plans, accounts, users, verification_codes, billing_transactions, audit_logs, global_settings';
    RAISE NOTICE '👑 Super Admin: CPF 00000000000';
    RAISE NOTICE '🏪 Empresa Demo: CNPJ 12345678000100, CPF 12345678900';
    RAISE NOTICE '⏰ Trial: 30 dias para empresa demo';
END $$;

