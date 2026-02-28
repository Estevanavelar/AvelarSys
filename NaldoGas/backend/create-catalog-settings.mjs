import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("POSTGRES_URL not found");
  process.exit(1);
}

const client = postgres(connectionString, { ssl: "require", max: 1 });
const db = drizzle(client);

async function createCatalogSettingsTable() {
  try {
    console.log("Creating catalog_settings table...");
    
    await client`
      CREATE TABLE IF NOT EXISTS catalog_settings (
        id SERIAL PRIMARY KEY,
        whatsapp_number VARCHAR(20) NOT NULL,
        default_message TEXT,
        cloudflare_api_token VARCHAR(255),
        cloudflare_zone_id VARCHAR(255),
        custom_domain VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    
    console.log("✅ Table catalog_settings created successfully!");
    
    // Inserir configuração padrão
    console.log("Inserting default settings...");
    await client`
      INSERT INTO catalog_settings (whatsapp_number, default_message)
      VALUES ('5511999999999', 'Olá! Gostaria de confirmar meu pedido.')
      ON CONFLICT DO NOTHING;
    `;
    
    console.log("✅ Default settings inserted!");
    
  } catch (error) {
    console.error("Error creating table:", error);
    throw error;
  } finally {
    await client.end();
  }
}

createCatalogSettingsTable();
