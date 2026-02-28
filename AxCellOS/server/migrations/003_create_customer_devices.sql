-- Migration: 003_create_customer_devices.sql
-- Descrição: Tabela de aparelhos vinculados por cliente (CPF) no AxCellOS

CREATE TABLE IF NOT EXISTS customer_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id VARCHAR(14) NOT NULL REFERENCES users(id),
  owner_cpf VARCHAR(11) NOT NULL,
  customer_id VARCHAR(11) NOT NULL REFERENCES customers(id),

  brand VARCHAR(100) NOT NULL,
  model VARCHAR(150) NOT NULL,
  device_label VARCHAR(300) NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_devices_account_id_idx
  ON customer_devices(account_id);

CREATE INDEX IF NOT EXISTS customer_devices_owner_cpf_idx
  ON customer_devices(owner_cpf);

CREATE INDEX IF NOT EXISTS customer_devices_customer_id_idx
  ON customer_devices(customer_id);

CREATE INDEX IF NOT EXISTS customer_devices_customer_active_idx
  ON customer_devices(customer_id, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS customer_devices_unique_per_customer_idx
  ON customer_devices(account_id, customer_id, brand, model);

