import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./drizzle/schema.ts";

// Conectar ao banco
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ POSTGRES_URL ou DATABASE_URL não encontrada!");
  process.exit(1);
}

const client = postgres(connectionString, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});
const db = drizzle(client, { schema });

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...\n");

  try {
    // 1. PRODUTOS
    console.log("📦 Criando produtos...");
    const products = await db.insert(schema.products).values([
      {
        name: "GLP 13Kg",
        description: "Botijão de gás GLP 13Kg completo",
        sku: "GLP-13",
        salePrice: "150.00",
        costPrice: "120.00",
        minStock: 10,
        isContainer: true,
      },
      {
        name: "Água 20L",
        description: "Galão de água mineral 20 litros",
        sku: "AGUA-20",
        salePrice: "15.00",
        costPrice: "10.00",
        minStock: 20,
        isContainer: true,
      },
      {
        name: "GLP 8Kg",
        description: "Botijão de gás GLP 8Kg completo",
        sku: "GLP-8",
        salePrice: "90.00",
        costPrice: "70.00",
        minStock: 5,
        isContainer: true,
      },
      {
        name: "Mangueira 1,5m",
        description: "Mangueira para gás 1,5 metros",
        sku: "MANG-15",
        salePrice: "25.00",
        costPrice: "15.00",
        minStock: 15,
        isContainer: false,
      },
      {
        name: "Regulador de Gás",
        description: "Regulador de pressão para botijão",
        sku: "REG-GAS",
        salePrice: "35.00",
        costPrice: "20.00",
        minStock: 10,
        isContainer: false,
      },
      {
        name: "Abraçadeira",
        description: "Abraçadeira para mangueira de gás",
        sku: "ABRAC",
        salePrice: "5.00",
        costPrice: "2.00",
        minStock: 50,
        isContainer: false,
      },
    ]).returning();
    console.log(`✅ ${products.length} produtos criados\n`);

    // 2. ESTOQUE
    console.log("📊 Criando estoque inicial...");
    const inventory = await db.insert(schema.inventory).values([
      { productId: products[0].id, quantity: 50 }, // GLP 13Kg
      { productId: products[1].id, quantity: 100 }, // Água 20L
      { productId: products[2].id, quantity: 30 }, // GLP 8Kg
      { productId: products[3].id, quantity: 25 }, // Mangueira
      { productId: products[4].id, quantity: 20 }, // Regulador
      { productId: products[5].id, quantity: 100 }, // Abraçadeira
    ]).returning();
    console.log(`✅ ${inventory.length} itens de estoque criados\n`);

    // 3. CLIENTES
    console.log("👥 Criando clientes de exemplo...");
    const customers = await db.insert(schema.customers).values([
      {
        name: "Maria Santos",
        phone: "27999998888",
        cpf: "12345678900",
        address: "Rua das Flores, 123",
        city: "Vila Velha",
        state: "ES",
        zipCode: "29100000",
        notes: "Cliente preferencial",
      },
      {
        name: "João Silva",
        phone: "27988887777",
        cpf: "98765432100",
        address: "Av. Principal, 456",
        city: "Vila Velha",
        state: "ES",
        zipCode: "29100100",
        notes: "Compra semanalmente",
      },
      {
        name: "Ana Costa",
        phone: "27977776666",
        cpf: "11122233344",
        address: "Rua do Comércio, 789",
        city: "Vila Velha",
        state: "ES",
        zipCode: "29100200",
      },
      {
        name: "Pedro Oliveira",
        phone: "27966665555",
        cpf: "55566677788",
        address: "Rua Nova, 321",
        city: "Vila Velha",
        state: "ES",
        zipCode: "29100300",
      },
      {
        name: "Carla Mendes",
        phone: "27955554444",
        cpf: "99988877766",
        address: "Av. Central, 654",
        city: "Vila Velha",
        state: "ES",
        zipCode: "29100400",
        notes: "Prefere receber por WhatsApp",
      },
    ]).returning();
    console.log(`✅ ${customers.length} clientes criados\n`);

    // 4. VASILHAMES (Containers)
    console.log("🔄 Criando controle de vasilhames...");
    const containers = await db.insert(schema.containers).values([
      { productId: products[0].id, status: "full", quantity: 50 }, // GLP 13Kg cheios
      { productId: products[0].id, status: "empty", quantity: 30 }, // GLP 13Kg vazios
      { productId: products[1].id, status: "full", quantity: 100 }, // Água 20L cheios
      { productId: products[1].id, status: "empty", quantity: 50 }, // Água 20L vazios
      { productId: products[2].id, status: "full", quantity: 30 }, // GLP 8Kg cheios
      { productId: products[2].id, status: "empty", quantity: 15 }, // GLP 8Kg vazios
    ]).returning();
    console.log(`✅ ${containers.length} registros de vasilhames criados\n`);

    console.log("🎉 Seed concluído com sucesso!\n");
    console.log("📋 Resumo:");
    console.log(`   - ${products.length} produtos`);
    console.log(`   - ${inventory.length} itens de estoque`);
    console.log(`   - ${customers.length} clientes`);
    console.log(`   - ${containers.length} registros de vasilhames`);
    console.log("\n✨ Banco de dados pronto para uso!");

  } catch (error) {
    console.error("❌ Erro ao executar seed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
