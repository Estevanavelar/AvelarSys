import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL;
const client = postgres(connectionString, { ssl: "require" });
const db = drizzle(client);

async function createDeliverySchema() {
  try {
    // Criar ENUM delivery_status
    await client`CREATE TYPE delivery_status AS ENUM ('pending', 'in_transit', 'delivered')`;
    console.log("✅ ENUM delivery_status criado com sucesso!");

    // Criar tabela deliverers
    await client`
      CREATE TABLE deliverers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log("✅ Tabela deliverers criada com sucesso!");

    // Adicionar colunas à tabela sales
    await client`ALTER TABLE sales ADD COLUMN deliverer_id INTEGER REFERENCES deliverers(id)`;
    await client`ALTER TABLE sales ADD COLUMN delivery_status delivery_status DEFAULT 'pending'`;
    await client`ALTER TABLE sales ADD COLUMN delivery_address JSON`;
    console.log("✅ Colunas adicionadas à tabela sales!");

    // Adicionar coluna à tabela public_orders
    await client`ALTER TABLE public_orders ADD COLUMN deliverer_id INTEGER REFERENCES deliverers(id)`;
    console.log("✅ Coluna deliverer_id adicionada à tabela public_orders!");

    console.log("\n🎉 Schema de entregas criado com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao criar schema:", error.message);
  } finally {
    await client.end();
  }
}

createDeliverySchema();
