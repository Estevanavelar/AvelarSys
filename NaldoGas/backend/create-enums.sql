-- Criar todos os ENUMs necessários para o schema do NaldoGás

CREATE TYPE IF NOT EXISTS "role" AS ENUM ('admin', 'vendor', 'deliverer', 'user');
CREATE TYPE IF NOT EXISTS "container_status" AS ENUM ('full', 'empty', 'customer_possession');
CREATE TYPE IF NOT EXISTS "payment_method" AS ENUM ('cash', 'credit_card', 'debit_card', 'pix', 'credit');
CREATE TYPE IF NOT EXISTS "sales_channel" AS ENUM ('portaria', 'telegas', 'whatsapp');
CREATE TYPE IF NOT EXISTS "sale_status" AS ENUM ('completed', 'pending', 'cancelled');
CREATE TYPE IF NOT EXISTS "receivable_status" AS ENUM ('pending', 'partial', 'paid', 'overdue');
CREATE TYPE IF NOT EXISTS "payable_status" AS ENUM ('pending', 'paid');
CREATE TYPE IF NOT EXISTS "pending_sale_status" AS ENUM ('pending', 'in_transit', 'delivered', 'cancelled');
CREATE TYPE IF NOT EXISTS "cash_register_type" AS ENUM ('opening', 'closing');
