-- Migration: 008_rename_customer_password_to_device_password.sql
-- Descrição: Renomeia coluna para senha do aparelho (PIN/pattern do celular)

ALTER TABLE orders RENAME COLUMN customer_password TO device_password;
