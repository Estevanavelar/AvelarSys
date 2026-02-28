-- Migration: 006_orders_id_as_order_number.sql
-- Descrição: Altera orders.id de UUID para VARCHAR(50) = order_number (número da OS)
-- O ID da ordem passa a ser o mesmo que o número da OS

-- 1. Remover FKs que referenciam orders.id
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_order_id_orders_id_fk;
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_order_id_orders_id_fk;

-- 2. Adicionar coluna id_new em orders e popular com order_number
ALTER TABLE orders ADD COLUMN IF NOT EXISTS id_new VARCHAR(50);
UPDATE orders SET id_new = order_number WHERE id_new IS NULL;

-- 3. order_items: nova coluna order_id_new com o order_number correspondente
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS order_id_new VARCHAR(50);
UPDATE order_items oi
SET order_id_new = o.order_number
FROM orders o
WHERE o.id = oi.order_id;

-- 4. sales: nova coluna order_id_new
ALTER TABLE sales ADD COLUMN IF NOT EXISTS order_id_new VARCHAR(50);
UPDATE sales s
SET order_id_new = o.order_number
FROM orders o
WHERE o.id = s.order_id AND s.order_id IS NOT NULL;

-- 5. Remover PK de orders
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_pkey;

-- 6. Remover coluna id antiga e renomear id_new
ALTER TABLE orders DROP COLUMN IF EXISTS id;
ALTER TABLE orders RENAME COLUMN id_new TO id;
ALTER TABLE orders ADD PRIMARY KEY (id);

-- 7. order_items: trocar order_id
ALTER TABLE order_items DROP COLUMN IF EXISTS order_id;
ALTER TABLE order_items RENAME COLUMN order_id_new TO order_id;
ALTER TABLE order_items ALTER COLUMN order_id SET NOT NULL;
ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id);

-- 8. sales: trocar order_id
ALTER TABLE sales DROP COLUMN IF EXISTS order_id;
ALTER TABLE sales RENAME COLUMN order_id_new TO order_id;
ALTER TABLE sales ADD CONSTRAINT sales_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id);
