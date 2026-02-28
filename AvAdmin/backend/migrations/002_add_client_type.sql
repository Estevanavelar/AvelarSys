-- ========================================
-- MIGRATION: Add client_type to accounts
-- ========================================
-- Date: 2026-01-06
-- Description: Adds client_type enum for multi-domain architecture

-- Create client_type enum if not exists
DO $$ BEGIN
    CREATE TYPE client_type AS ENUM ('cliente', 'lojista', 'distribuidor', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add client_type column to accounts table
ALTER TABLE avelar_admin.accounts 
ADD COLUMN IF NOT EXISTS client_type client_type DEFAULT 'lojista' NOT NULL;

-- Create index for client_type
CREATE INDEX IF NOT EXISTS idx_accounts_client_type ON avelar_admin.accounts(client_type);

-- Update existing accounts to have client_type based on their characteristics
-- Admin accounts (accounts with enabled_modules containing 'AvAdmin')
UPDATE avelar_admin.accounts 
SET client_type = 'admin' 
WHERE enabled_modules::text LIKE '%AvAdmin%';

COMMENT ON COLUMN avelar_admin.accounts.client_type IS 'Type of client: cliente (end user), lojista (retailer), distribuidor (distributor), admin (internal admin)';

