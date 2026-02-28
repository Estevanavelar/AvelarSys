-- Migration: 007_add_customer_password_to_orders.sql
-- Descrição: Adiciona coluna customer_password para senha de acesso do cliente à OS

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_password VARCHAR(50);
