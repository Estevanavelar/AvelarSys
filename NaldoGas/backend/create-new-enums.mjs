import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("POSTGRES_URL não configurado");
  process.exit(1);
}

const client = postgres(connectionString, { ssl: "require" });
const db = drizzle(client);

async function createEnums() {
  try {
    console.log("Criando ENUMs...");
    
    // Criar ENUM discount_type
    await client.unsafe(`
      DO $$ BEGIN
        CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("✓ ENUM discount_type criado");
    
    // Criar ENUM order_status
    await client.unsafe(`
      DO $$ BEGIN
        CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'in_delivery', 'delivered', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("✓ ENUM order_status criado");
    
    console.log("\n✅ Todos os ENUMs foram criados com sucesso!");
    
  } catch (error) {
    console.error("❌ Erro ao criar ENUMs:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createEnums();
