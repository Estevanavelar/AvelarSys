-- Migration: Refatoração de Users e Customers
-- Data: 2026-02-07
-- Descrição: 
--   - users: agora armazena dados de ACCOUNTS (empresa/loja) do AvAdmin
--   - customers: simplificada para apenas referenciar users do AvAdmin (clientes finais)

-- Criar schema se não existir
CREATE SCHEMA IF NOT EXISTS avelar_axcellos;

-- Backup das tabelas existentes (se existirem)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'avelar_axcellos' AND tablename = 'users') THEN
        ALTER TABLE avelar_axcellos.users RENAME TO users_backup_20260207;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'avelar_axcellos' AND tablename = 'customers') THEN
        ALTER TABLE avelar_axcellos.customers RENAME TO customers_backup_20260207;
    END IF;
END $$;

-- =================================
-- NOVA TABELA: users (dados da empresa/loja do AvAdmin)
-- =================================
CREATE TABLE IF NOT EXISTS avelar_axcellos.users (
    id VARCHAR(14) PRIMARY KEY, -- CNPJ (14 dígitos)
    company_name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(14) NOT NULL UNIQUE,
    responsible_name VARCHAR(255),
    whatsapp VARCHAR(15),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(8),
    status VARCHAR(50) DEFAULT 'active',
    client_type VARCHAR(50),
    enabled_modules JSONB,
    settings JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =================================
-- NOVA TABELA: customers (referências a clientes finais do AvAdmin)
-- =================================
CREATE TABLE IF NOT EXISTS avelar_axcellos.customers (
    id VARCHAR(11) PRIMARY KEY, -- CPF (11 dígitos)
    account_id VARCHAR(14) NOT NULL REFERENCES avelar_axcellos.users(id),
    name VARCHAR(255), -- Cache do full_name do AvAdmin
    whatsapp VARCHAR(15), -- Cache do whatsapp do AvAdmin
    notes TEXT, -- Observações locais do lojista
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =================================
-- ATUALIZAR TABELA: devices
-- =================================
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'avelar_axcellos' AND tablename = 'devices') THEN
        -- Adiciona coluna operator_cpf se não existir
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'avelar_axcellos' AND table_name = 'devices' AND column_name = 'operator_cpf') THEN
            ALTER TABLE avelar_axcellos.devices ADD COLUMN operator_cpf VARCHAR(11);
        END IF;
        -- Remove user_id se existir (substituído por operator_cpf)
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'avelar_axcellos' AND table_name = 'devices' AND column_name = 'user_id') THEN
            ALTER TABLE avelar_axcellos.devices DROP COLUMN user_id;
        END IF;
    END IF;
END $$;

-- =================================
-- ATUALIZAR TABELA: orders
-- =================================
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'avelar_axcellos' AND tablename = 'orders') THEN
        -- Adiciona coluna operator_cpf se não existir
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'avelar_axcellos' AND table_name = 'orders' AND column_name = 'operator_cpf') THEN
            ALTER TABLE avelar_axcellos.orders ADD COLUMN operator_cpf VARCHAR(11);
        END IF;
        -- Atualiza customer_id para VARCHAR(11) se necessário
        ALTER TABLE avelar_axcellos.orders ALTER COLUMN customer_id TYPE VARCHAR(11);
        -- Remove user_id se existir (substituído por operator_cpf)
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'avelar_axcellos' AND table_name = 'orders' AND column_name = 'user_id') THEN
            ALTER TABLE avelar_axcellos.orders DROP COLUMN user_id;
        END IF;
    END IF;
END $$;

-- =================================
-- ATUALIZAR TABELA: sales
-- =================================
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'avelar_axcellos' AND tablename = 'sales') THEN
        -- Adiciona coluna operator_cpf se não existir
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'avelar_axcellos' AND table_name = 'sales' AND column_name = 'operator_cpf') THEN
            ALTER TABLE avelar_axcellos.sales ADD COLUMN operator_cpf VARCHAR(11);
        END IF;
        -- Atualiza customer_id para VARCHAR(11) se necessário
        ALTER TABLE avelar_axcellos.sales ALTER COLUMN customer_id TYPE VARCHAR(11);
        -- Remove user_id se existir (substituído por operator_cpf)
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'avelar_axcellos' AND table_name = 'sales' AND column_name = 'user_id') THEN
            ALTER TABLE avelar_axcellos.sales DROP COLUMN user_id;
        END IF;
    END IF;
END $$;

-- =================================
-- ATUALIZAR TABELA: report_data
-- =================================
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'avelar_axcellos' AND tablename = 'report_data') THEN
        -- Adiciona coluna generated_by_cpf se não existir
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'avelar_axcellos' AND table_name = 'report_data' AND column_name = 'generated_by_cpf') THEN
            ALTER TABLE avelar_axcellos.report_data ADD COLUMN generated_by_cpf VARCHAR(11);
        END IF;
        -- Remove generated_by se existir (substituído por generated_by_cpf)
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'avelar_axcellos' AND table_name = 'report_data' AND column_name = 'generated_by') THEN
            ALTER TABLE avelar_axcellos.report_data DROP COLUMN generated_by;
        END IF;
    END IF;
END $$;

-- =================================
-- ÍNDICES
-- =================================
CREATE INDEX IF NOT EXISTS idx_customers_account_id ON avelar_axcellos.customers(account_id);
CREATE INDEX IF NOT EXISTS idx_orders_account_id ON avelar_axcellos.orders(account_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON avelar_axcellos.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_operator_cpf ON avelar_axcellos.orders(operator_cpf);
CREATE INDEX IF NOT EXISTS idx_sales_account_id ON avelar_axcellos.sales(account_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON avelar_axcellos.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_products_account_id ON avelar_axcellos.products(account_id);

-- =================================
-- COMENTÁRIOS
-- =================================
COMMENT ON TABLE avelar_axcellos.users IS 'Dados da empresa/loja (sincronizado de accounts do AvAdmin). ID = CNPJ.';
COMMENT ON TABLE avelar_axcellos.customers IS 'Referências a clientes finais (client_type=cliente do AvAdmin). ID = CPF.';
COMMENT ON COLUMN avelar_axcellos.orders.operator_cpf IS 'CPF do operador que criou a ordem (referência a users do AvAdmin)';
COMMENT ON COLUMN avelar_axcellos.sales.operator_cpf IS 'CPF do operador que realizou a venda (referência a users do AvAdmin)';
