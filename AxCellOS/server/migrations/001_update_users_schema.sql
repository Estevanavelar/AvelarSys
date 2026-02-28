-- Update users table schema to sync from AvAdmin.accounts
-- Migration: 001_update_users_schema.sql

-- Add new columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS document_type VARCHAR(4),
ADD COLUMN IF NOT EXISTS document VARCHAR(14),
ADD COLUMN IF NOT EXISTS owner_cpf VARCHAR(11),
ADD COLUMN IF NOT EXISTS is_individual BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS previous_document VARCHAR(14),
ADD COLUMN IF NOT EXISTS plan_id UUID;

-- Rename company_name to business_name for consistency
ALTER TABLE users RENAME COLUMN company_name TO business_name_deprecated;
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);

-- Add comments
COMMENT ON COLUMN users.document_type IS 'Tipo de documento: cpf ou cnpj';
COMMENT ON COLUMN users.document IS 'Documento sem formatação (CPF ou CNPJ)';
COMMENT ON COLUMN users.owner_cpf IS 'CPF do dono da empresa (multi-tenancy)';
COMMENT ON COLUMN users.is_individual IS 'Pessoa física (true) ou jurídica (false)';
COMMENT ON COLUMN users.previous_document IS 'Documento anterior em caso de migração CPF→CNPJ';
COMMENT ON COLUMN users.business_name IS 'Nome da empresa/loja';

-- Create indexes
CREATE INDEX IF NOT EXISTS users_owner_cpf_idx ON users(owner_cpf);
CREATE INDEX IF NOT EXISTS users_document_idx ON users(document);