-- Migration: 004_fix_users_legacy_columns.sql
-- Descrição: Ajusta tabela avelar_axcellos.users para compatibilidade com o schema atual do AxCellOS
-- Motivação: a tabela existente tinha colunas legadas com constraints que quebravam inserts do backend

-- company_name: usado pelo backend atual (cache / alias)
ALTER TABLE avelar_axcellos.users
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);

-- business_name_deprecated: coluna legada que não é mais preenchida pelo backend.
-- Mantemos, mas removemos NOT NULL e colocamos default para não quebrar inserts.
ALTER TABLE avelar_axcellos.users
  ALTER COLUMN business_name_deprecated SET DEFAULT '';

ALTER TABLE avelar_axcellos.users
  ALTER COLUMN business_name_deprecated DROP NOT NULL;

-- cnpj: legado (o backend atual usa id/document). Permitir NULL para não quebrar inserts.
ALTER TABLE avelar_axcellos.users
  ALTER COLUMN cnpj DROP NOT NULL;

