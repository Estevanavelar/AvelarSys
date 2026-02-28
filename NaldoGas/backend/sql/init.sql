-- =======================================
-- NALDOGAS - Inicialização do Banco de Dados
-- =======================================

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Criar schema principal
CREATE SCHEMA IF NOT EXISTS public;

-- Comentário do banco
COMMENT ON DATABASE naldogas IS 'Banco de dados do módulo NaldoGás - Sistema de Gestão para Depósitos de Gás';

-- Nota: As tabelas serão criadas pelo Drizzle ORM
-- Este script apenas prepara o banco com extensões necessárias
