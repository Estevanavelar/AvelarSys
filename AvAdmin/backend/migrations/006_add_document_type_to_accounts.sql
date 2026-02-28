-- Add document type fields to accounts table for CPF/CNPJ support
-- Migration: 006_add_document_type_to_accounts.sql

-- Create document_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE document_type AS ENUM ('cpf', 'cnpj');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS document VARCHAR(14),
ADD COLUMN IF NOT EXISTS document_type document_type DEFAULT 'cnpj' NOT NULL,
ADD COLUMN IF NOT EXISTS is_individual BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS previous_document VARCHAR(14);

-- Populate document column with existing cnpj values (for backward compatibility)
UPDATE accounts SET document = cnpj WHERE document IS NULL;

-- Make document column NOT NULL after populating
ALTER TABLE accounts ALTER COLUMN document SET NOT NULL;

-- Add comments
COMMENT ON COLUMN accounts.document IS 'Documento sem formatação (CPF ou CNPJ)';
COMMENT ON COLUMN accounts.document_type IS 'Tipo de documento: cpf ou cnpj';
COMMENT ON COLUMN accounts.is_individual IS 'Pessoa física (true) ou jurídica (false)';
COMMENT ON COLUMN accounts.previous_document IS 'Documento anterior em caso de migração CPF→CNPJ';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_accounts_document ON accounts(document);
CREATE INDEX IF NOT EXISTS idx_accounts_document_type ON accounts(document_type);