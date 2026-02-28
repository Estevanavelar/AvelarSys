-- Add category field to plans table for auto-detection
-- Migration: 005_add_category_to_plans.sql

-- Create enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE plan_category AS ENUM ('lojista', 'distribuidor', 'cliente_final');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add category column to plans table
ALTER TABLE plans ADD COLUMN IF NOT EXISTS category plan_category NOT NULL DEFAULT 'lojista';

-- Add comment to explain the purpose
COMMENT ON COLUMN plans.category IS 'Categoria do plano para auto-detecção: lojista, distribuidor, cliente_final';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_plans_category ON plans(category);