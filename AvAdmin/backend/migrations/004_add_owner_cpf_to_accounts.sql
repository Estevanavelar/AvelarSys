-- ========================================
-- Migration: Add owner_cpf to accounts table
-- ========================================
-- Adiciona o campo owner_cpf na tabela accounts para identificar
-- o CPF do dono da empresa, facilitando filtros multi-tenancy no SaaS
-- ========================================

-- Adicionar coluna owner_cpf na tabela accounts
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS owner_cpf VARCHAR(11);

-- Criar índice para facilitar buscas por owner_cpf
CREATE INDEX IF NOT EXISTS idx_accounts_owner_cpf ON accounts(owner_cpf);

-- Adicionar foreign key para users.cpf (opcional - comentado por padrão)
-- Descomente se quiser garantir integridade referencial
-- ALTER TABLE accounts 
-- ADD CONSTRAINT fk_accounts_owner_cpf 
-- FOREIGN KEY (owner_cpf) REFERENCES users(cpf) ON DELETE SET NULL;

-- Comentário na coluna
COMMENT ON COLUMN accounts.owner_cpf IS 'CPF do dono/responsável legal da empresa para filtros multi-tenancy';

-- ========================================
-- FINALIZAÇÃO
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 004: Campo owner_cpf adicionado à tabela accounts';
    RAISE NOTICE '📊 Índice idx_accounts_owner_cpf criado';
END $$;
