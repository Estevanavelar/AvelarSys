-- Migration: 005_add_warranty_until_to_orders.sql
-- Descrição: Adiciona coluna warranty_until para ordens de serviço (garantia em dias)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS warranty_until TIMESTAMP;
