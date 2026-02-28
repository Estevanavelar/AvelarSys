-- ========================================
-- LUCRUM - Inicialização Banco Financeiro
-- ========================================
-- Este script é executado automaticamente na primeira inicialização
-- do PostgreSQL do módulo Lucrum via Docker

-- Configurações do banco
SET timezone = 'America/Sao_Paulo';
SET default_text_search_config = 'portuguese';

-- =======================================
-- EXTENSÕES ÚTEIS
-- =======================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- Para busca fuzzy
CREATE EXTENSION IF NOT EXISTS "unaccent";    -- Remove acentos
CREATE EXTENSION IF NOT EXISTS "citext";      -- Case insensitive text

-- =======================================
-- FUNÇÕES AUXILIARES FINANCEIRAS
-- =======================================

-- Função para gerar códigos únicos de transações financeiras
CREATE OR REPLACE FUNCTION generate_transaction_code()
RETURNS text AS $$
DECLARE
    code text;
    exists_code boolean := true;
BEGIN
    WHILE exists_code LOOP
        -- Gera código: LC + 8 dígitos + letra aleatória
        code := 'LC' || LPAD(floor(random() * 99999999)::text, 8, '0') || 
                chr(65 + floor(random() * 26)::int);
        
        -- Verifica se já existe (quando tabela for criada)
        -- SELECT EXISTS(SELECT 1 FROM transactions WHERE code = code) INTO exists_code;
        exists_code := false; -- Por enquanto sempre falso até criar tabelas
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular juros compostos
CREATE OR REPLACE FUNCTION calculate_compound_interest(principal decimal, rate decimal, time_periods integer)
RETURNS decimal AS $$
BEGIN
    RETURN principal * power(1 + rate, time_periods);
END;
$$ LANGUAGE plpgsql;

-- =======================================
-- MENSAGEM DE INICIALIZAÇÃO
-- =======================================
DO $$
BEGIN
    RAISE NOTICE '💰 Lucrum Database inicializado com sucesso!';
    RAISE NOTICE '📊 Extensões: uuid-ossp, pg_trgm, unaccent, citext';
    RAISE NOTICE '🔧 Funções: generate_transaction_code(), calculate_compound_interest()';
    RAISE NOTICE '⏰ Timezone: America/Sao_Paulo';
    RAISE NOTICE '🇧🇷 Text Search: Portuguese';
    RAISE NOTICE '🚧 Módulo em desenvolvimento - estrutura base criada';
END $$;