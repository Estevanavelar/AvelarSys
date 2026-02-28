-- Add owner_cpf field to multi-tenant tables
-- Migration: 002_add_owner_cpf_to_tables.sql

-- Add owner_cpf to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS owner_cpf VARCHAR(11);
CREATE INDEX IF NOT EXISTS products_owner_cpf_idx ON products(owner_cpf);

-- Add owner_cpf to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS owner_cpf VARCHAR(11);
CREATE INDEX IF NOT EXISTS orders_owner_cpf_idx ON orders(owner_cpf);

-- Add owner_cpf to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS owner_cpf VARCHAR(11);
CREATE INDEX IF NOT EXISTS sales_owner_cpf_idx ON sales(owner_cpf);

-- Add owner_cpf to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS owner_cpf VARCHAR(11);
CREATE INDEX IF NOT EXISTS devices_owner_cpf_idx ON devices(owner_cpf);