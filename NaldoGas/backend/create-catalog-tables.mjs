import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("POSTGRES_URL não configurado");
  process.exit(1);
}

const client = postgres(connectionString, { ssl: "require" });

async function createTables() {
  try {
    console.log("Criando tabelas do Catálogo Público...\n");
    
    // Criar tabela coupons
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        discount_type discount_type NOT NULL,
        discount_value NUMERIC(10, 2) NOT NULL,
        min_purchase_amount NUMERIC(10, 2) DEFAULT 0,
        max_uses INTEGER,
        used_count INTEGER DEFAULT 0 NOT NULL,
        valid_from TIMESTAMP NOT NULL,
        valid_until TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log("✓ Tabela 'coupons' criada");
    
    // Criar tabela public_customers
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS public_customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL,
        cpf VARCHAR(14),
        password_hash VARCHAR(255) NOT NULL,
        address JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log("✓ Tabela 'public_customers' criada");
    
    // Criar tabela public_orders
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS public_orders (
        id SERIAL PRIMARY KEY,
        public_customer_id INTEGER NOT NULL REFERENCES public_customers(id),
        items JSONB NOT NULL,
        subtotal NUMERIC(10, 2) NOT NULL,
        discount NUMERIC(10, 2) DEFAULT 0 NOT NULL,
        total NUMERIC(10, 2) NOT NULL,
        coupon_code VARCHAR(50),
        status order_status DEFAULT 'pending' NOT NULL,
        delivery_address JSONB NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log("✓ Tabela 'public_orders' criada");
    
    console.log("\n✅ Todas as tabelas do Catálogo Público foram criadas com sucesso!");
    
  } catch (error) {
    console.error("❌ Erro ao criar tabelas:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTables();
