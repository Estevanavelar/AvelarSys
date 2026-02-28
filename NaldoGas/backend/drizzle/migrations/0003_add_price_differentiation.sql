-- Migration: Adicionar preços diferenciados por forma de pagamento
-- Fase 14 - Sistema de Preços Diferenciados

-- Adicionar novos campos para preços diferenciados
ALTER TABLE products ADD COLUMN IF NOT EXISTS "priceCash" NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS "priceCard" NUMERIC(10, 2);

-- Comentários para documentação
COMMENT ON COLUMN products."priceCash" IS 'Preço para pagamento à vista (PIX/Dinheiro)';
COMMENT ON COLUMN products."priceCard" IS 'Preço para pagamento com cartão (Crédito/Débito)';
COMMENT ON COLUMN products."salePrice" IS 'DEPRECATED: Usar priceCash ou priceCard';

-- Migrar dados existentes (salePrice -> priceCash e priceCard)
-- Assumindo que priceCard = salePrice e priceCash = salePrice * 0.95 (5% desconto)
UPDATE products 
SET 
  "priceCash" = "salePrice" * 0.95,
  "priceCard" = "salePrice"
WHERE "priceCash" IS NULL OR "priceCard" IS NULL;
