-- Create performance indexes for AvAdmin database
-- Migration: 007_create_indexes.sql

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf);
CREATE INDEX IF NOT EXISTS idx_users_account_id ON users(account_id);
CREATE INDEX IF NOT EXISTS idx_users_client_type ON users(client_type);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Accounts table indexes
CREATE INDEX IF NOT EXISTS idx_accounts_owner_cpf ON accounts(owner_cpf);
CREATE INDEX IF NOT EXISTS idx_accounts_document ON accounts(document);
CREATE INDEX IF NOT EXISTS idx_accounts_document_type ON accounts(document_type);
CREATE INDEX IF NOT EXISTS idx_accounts_plan_id ON accounts(plan_id);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_client_type ON accounts(client_type);

-- Plans table indexes
CREATE INDEX IF NOT EXISTS idx_plans_category ON plans(category);
CREATE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);

-- Billing transactions indexes
CREATE INDEX IF NOT EXISTS idx_billing_transactions_account_id ON billing_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_plan_id ON billing_transactions(plan_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_status ON billing_transactions(status);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_created_at ON billing_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_paid_at ON billing_transactions(paid_at);

-- Audit log indexes (if table exists)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_account_id ON audit_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);