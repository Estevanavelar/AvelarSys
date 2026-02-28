/**
 * Serviço de Sincronização com AvAdmin
 * 
 * Responsável por sincronizar dados do AvAdmin para o AxCellOS:
 * - users (tabela local) <- accounts (AvAdmin)
 * - customers (tabela local) <- users com client_type="cliente" (AvAdmin)
 */

import { db } from "../db";
import { users, customers } from "../db/schema";
import { eq } from "drizzle-orm";
import { AvAdminAccount, AvAdminUser } from "../lib/avadmin-api";

/**
 * Sincroniza os dados da account do AvAdmin para a tabela users do AxCellOS
 * Puxa TODOS os campos de AvAdmin.accounts conforme documentação
 * Chamado no primeiro acesso do lojista
 */
export async function syncAccountToUsers(
  account: AvAdminAccount,
  clientType: string
): Promise<void> {
  if (!account || !account.id) {
    console.warn("[Sync] Tentativa de sincronizar account sem ID");
    return;
  }

  try {
    // Verifica se já existe
    const existing = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, account.id))
      .limit(1);

    const userData = {
      // Identidade (de accounts.id)
      id: account.id,
      documentType: account.document_type,
      document: account.document,

      // Informações da Empresa
      businessName: account.business_name,

      // Multi-Tenancy
      ownerCpf: account.owner_cpf,
      isIndividual: account.is_individual,

      // Contato
      whatsapp: account.whatsapp,

      // Endereço
      address: account.address,
      city: account.city,
      state: account.state,
      zipCode: account.zip_code,

      // Status
      status: account.status,
      enabledModules: account.enabled_modules,

      // Historico
      previousDocument: account.previous_document,
      planId: account.plan_id,

      // Controle
      clientType: clientType,
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      // Já existe, atualiza todos os campos
      await db.update(users)
        .set(userData)
        .where(eq(users.id, account.id));

      console.log(`[Sync] Account ${account.id} atualizada no AxCellOS`);
      return;
    }

    // Primeiro acesso - cria o registro
    await db.insert(users).values({
      ...userData,
      createdAt: new Date(),
      isActive: true,
    });

    console.log(`[Sync] Account ${account.id} (${account.business_name}) sincronizada no AxCellOS`);
  } catch (error) {
    console.error("[Sync] Erro ao sincronizar account:", error);
    // Não lança erro para não bloquear o acesso
  }
}

/**
 * Sincroniza um cliente final do AvAdmin para a tabela customers do AxCellOS
 * Chamado quando um cliente é selecionado/usado
 */
export async function syncCustomerFromAvAdmin(
  customerUser: AvAdminUser, 
  accountId: string
): Promise<void> {
  if (!customerUser || !customerUser.id) {
    console.warn("[Sync] Tentativa de sincronizar customer sem ID");
    return;
  }

  try {
    // Verifica se já existe
    const existing = await db.select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, customerUser.cpf))
      .limit(1);

    if (existing.length > 0) {
      // Já existe, atualiza cache de dados
      await db.update(customers)
        .set({ 
          name: customerUser.full_name,
          whatsapp: customerUser.whatsapp,
          lastSyncAt: new Date(),
        })
        .where(eq(customers.id, customerUser.cpf));
      
      console.log(`[Sync] Customer ${customerUser.cpf} atualizado`);
      return;
    }

    // Primeiro uso - cria o registro de referência
    await db.insert(customers).values({
      id: customerUser.cpf,
      accountId: accountId,
      name: customerUser.full_name,
      whatsapp: customerUser.whatsapp,
      isActive: true,
      lastSyncAt: new Date(),
    });

    console.log(`[Sync] Customer ${customerUser.cpf} (${customerUser.full_name}) referenciado no AxCellOS`);
  } catch (error) {
    console.error("[Sync] Erro ao sincronizar customer:", error);
    // Não lança erro para não bloquear a operação
  }
}

/**
 * Garante que existe um registro em users para o accountId (evita FK violation).
 * Usado quando o AvAdmin não retornou account no validateToken mas o token tem account_id.
 */
export async function ensureUserExists(
  accountId: string,
  ownerCpf: string
): Promise<void> {
  if (!accountId || accountId.length > 14) return;
  const owner = String(ownerCpf ?? "").replace(/\D/g, "").slice(0, 11) || accountId.replace(/\D/g, "").slice(0, 11);
  if (!owner || owner.length !== 11) return;

  try {
    const existing = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, accountId))
      .limit(1);

    if (existing.length > 0) return;

    await db.insert(users).values({
      id: accountId.slice(0, 14),
      ownerCpf: owner,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`[Sync] User mínimo criado para account ${accountId} (owner_cpf referenciado)`);
  } catch (error) {
    console.error("[Sync] Erro ao garantir user:", error);
  }
}

/**
 * Verifica se a account está sincronizada no AxCellOS
 */
export async function isAccountSynced(accountId: string): Promise<boolean> {
  const existing = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.id, accountId))
    .limit(1);
  
  return existing.length > 0;
}

/**
 * Verifica se o customer está referenciado no AxCellOS
 */
export async function isCustomerSynced(customerId: string): Promise<boolean> {
  const existing = await db.select({ id: customers.id })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);
  
  return existing.length > 0;
}
