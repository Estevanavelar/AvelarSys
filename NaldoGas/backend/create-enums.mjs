import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("❌ POSTGRES_URL não encontrada!");
  process.exit(1);
}

const client = postgres(connectionString);

async function createEnums() {
  console.log("🔧 Criando ENUMs no PostgreSQL...\n");

  const enums = [
    { name: 'role', values: ['admin', 'vendor', 'deliverer', 'user'] },
    { name: 'container_status', values: ['full', 'empty', 'customer_possession'] },
    { name: 'payment_method', values: ['cash', 'credit_card', 'debit_card', 'pix', 'credit'] },
    { name: 'sales_channel', values: ['portaria', 'telegas', 'whatsapp'] },
    { name: 'sale_status', values: ['completed', 'pending', 'cancelled'] },
    { name: 'receivable_status', values: ['pending', 'partial', 'paid', 'overdue'] },
    { name: 'payable_status', values: ['pending', 'paid'] },
    { name: 'pending_sale_status', values: ['pending', 'in_transit', 'delivered', 'cancelled'] },
    { name: 'cash_register_type', values: ['opening', 'closing'] },
  ];

  try {
    for (const enumDef of enums) {
      try {
        const valuesStr = enumDef.values.map(v => `'${v}'`).join(', ');
        await client.unsafe(`CREATE TYPE "${enumDef.name}" AS ENUM (${valuesStr})`);
        console.log(`✅ ENUM '${enumDef.name}' criado`);
      } catch (error) {
        if (error.code === '42710') {
          console.log(`ℹ️ ENUM '${enumDef.name}' já existe`);
        } else {
          throw error;
        }
      }
    }

    console.log("\n🎉 Todos os ENUMs foram criados com sucesso!");

  } catch (error) {
    console.error("❌ Erro ao criar ENUMs:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createEnums();
