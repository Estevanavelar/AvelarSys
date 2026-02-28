-- Migration: 007_add_fee_columns_to_sales.sql
-- Descrição: Adiciona colunas de taxa e parcelamento na tabela sales

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS installments integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fee_amount numeric(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS fee_percent numeric(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS net_value numeric(10,2);
