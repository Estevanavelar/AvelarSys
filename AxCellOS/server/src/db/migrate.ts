/**
 * Executa migrations pendentes na inicialização do servidor.
 * Usa SQL bruto para alterações que o Drizzle não gerencia.
 */
import postgres from "postgres";
import { config } from "../lib/config";

const MIGRATIONS: Array<{ id: string; sql: string }> = [
  {
    id: "0002_drop_warranty_terms_account_fk",
    sql: 'ALTER TABLE "warranty_terms" DROP CONSTRAINT IF EXISTS "warranty_terms_account_id_users_id_fk"',
  },
];

export async function runMigrations(): Promise<void> {
  const sql = postgres(config.database.url, { max: 1 });
  try {
    await sql.unsafe`
      CREATE TABLE IF NOT EXISTS _axcellos_migrations (
        id varchar(100) PRIMARY KEY,
        applied_at timestamptz DEFAULT now()
      )
    `;

    for (const m of MIGRATIONS) {
      const existing = await sql`
        SELECT 1 FROM _axcellos_migrations WHERE id = ${m.id}
      `;
      if (existing.length > 0) continue;

      try {
        await sql.unsafe(m.sql);
        await sql`INSERT INTO _axcellos_migrations (id) VALUES (${m.id})`;
        console.log(`[Migrate] Aplicada: ${m.id}`);
      } catch (err: any) {
        if (err?.code === "42703" || err?.message?.includes("does not exist")) {
          console.log(`[Migrate] ${m.id} ignorada (constraint/coluna já inexistente)`);
        } else {
          throw err;
        }
      }
    }
  } finally {
    await sql.end();
  }
}
