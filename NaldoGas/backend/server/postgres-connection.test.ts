import { describe, it, expect } from "vitest";
import { getDb } from "./db";
import * as schema from "../drizzle/schema";

/**
 * Teste de Conexão com PostgreSQL do Neon
 * 
 * Valida que:
 * 1. A variável POSTGRES_URL está configurada corretamente
 * 2. A conexão com o banco PostgreSQL está funcionando
 * 3. As tabelas foram criadas com sucesso
 * 4. Os dados iniciais (seed) foram inseridos
 */

describe("Conexão PostgreSQL do Neon", () => {
  it("deve conectar ao banco de dados PostgreSQL", async () => {
    const db = await getDb();
    expect(db).toBeDefined();
  });

  it("deve ter produtos cadastrados no banco", async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados não disponível");

    const products = await db.select().from(schema.products);
    expect(products.length).toBeGreaterThan(0);
    
    // Verificar se os produtos do seed existem
    const productNames = products.map(p => p.name);
    expect(productNames).toContain("GLP 13Kg");
    expect(productNames).toContain("Água 20L");
  });

  it("deve ter clientes cadastrados no banco", async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados não disponível");

    const customers = await db.select().from(schema.customers);
    expect(customers.length).toBeGreaterThan(0);
    
    // Verificar se os clientes do seed existem
    const customerNames = customers.map(c => c.name);
    expect(customerNames).toContain("Maria Santos");
    expect(customerNames).toContain("João Silva");
  });

  it("deve ter estoque cadastrado no banco", async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados não disponível");

    const inventory = await db.select().from(schema.inventory);
    expect(inventory.length).toBeGreaterThan(0);
    
    // Verificar se há quantidade em estoque
    const totalQuantity = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
    expect(totalQuantity).toBeGreaterThan(0);
  });

  it("deve ter vasilhames cadastrados no banco", async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados não disponível");

    const containers = await db.select().from(schema.containers);
    expect(containers.length).toBeGreaterThan(0);
    
    // Verificar se há vasilhames cheios e vazios
    const fullContainers = containers.filter(c => c.status === "full");
    const emptyContainers = containers.filter(c => c.status === "empty");
    
    expect(fullContainers.length).toBeGreaterThan(0);
    expect(emptyContainers.length).toBeGreaterThan(0);
  });

  it("deve ter produtos com flag isContainer correta", async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados não disponível");

    const products = await db.select().from(schema.products);
    
    // GLP e Água devem ser containers
    const glp = products.find(p => p.name === "GLP 13Kg");
    const agua = products.find(p => p.name === "Água 20L");
    const mangueira = products.find(p => p.name === "Mangueira 1,5m");
    
    expect(glp?.isContainer).toBe(true);
    expect(agua?.isContainer).toBe(true);
    expect(mangueira?.isContainer).toBe(false);
  });

  it("deve ter clientes com CPF e telefone válidos", async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados não disponível");

    const customers = await db.select().from(schema.customers);
    
    // Verificar Maria Santos
    const maria = customers.find(c => c.name === "Maria Santos");
    expect(maria).toBeDefined();
    expect(maria?.cpf).toBe("12345678900");
    expect(maria?.phone).toBe("27999998888");
  });
});
