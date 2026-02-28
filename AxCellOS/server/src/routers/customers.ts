/**
 * Router de Customers - AxCellOS
 * 
 * Customers são clientes finais (client_type="cliente") do AvAdmin.
 * Esta tabela apenas REFERENCIA esses clientes pelo ID (CPF).
 * Os dados completos vêm do AvAdmin.
 */

import { router, protectedProcedure } from "../lib/trpc";
import { z } from "zod";
import { db } from "../db";
import { customers } from "../db/schema";
import { avadminApi } from "../lib/avadmin-api";
import { syncCustomerFromAvAdmin } from "../services/sync";
import { eq, and, ilike, desc, or } from "drizzle-orm";
import { emitToAccount } from "../lib/socket";

function maskCpf(cpf: string) {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}***${digits.slice(6, 9)}**`;
}

function normalizeClientType(clientType?: string | null) {
  return String(clientType || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function isAllowedCustomerType(clientType?: string | null) {
  const normalized = normalizeClientType(clientType);
  return normalized === "cliente" || normalized === "clientefinal";
}

function isNullLikeAccountId(accountId?: string | null) {
  if (accountId === null || accountId === undefined) return true;
  const normalized = String(accountId).trim().toLowerCase();
  return normalized === "" || normalized === "none" || normalized === "null";
}

function isEligibleCustomerProfile(user: {
  client_type?: string | null;
  account_id?: string | null;
  role?: string | null;
}) {
  if (isAllowedCustomerType(user.client_type)) return true;

  const role = String(user.role || "").trim().toLowerCase();
  const roleLooksLikePortalUser = role === "user" || role === "cliente" || role === "customer";
  return roleLooksLikePortalUser && isNullLikeAccountId(user.account_id);
}

async function upsertCustomerLocalByCpf(params: {
  cpf: string;
  accountId: string;
  name?: string | null;
  whatsapp?: string | null;
}) {
  const { cpf, accountId, name, whatsapp } = params;
  const existing = await db
    .select()
    .from(customers)
    .where(eq(customers.id, cpf))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(customers)
      .set({
        accountId,
        name: name || existing[0].name,
        whatsapp: whatsapp || existing[0].whatsapp || undefined,
        isActive: true,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, cpf));

    const updated = await db
      .select()
      .from(customers)
      .where(eq(customers.id, cpf))
      .limit(1);

    return updated[0] || existing[0];
  }

  await db.insert(customers).values({
    id: cpf,
    accountId,
    name: name || cpf,
    whatsapp: whatsapp || undefined,
    isActive: true,
    lastSyncAt: new Date(),
  });

  const created = await db
    .select()
    .from(customers)
    .where(eq(customers.id, cpf))
    .limit(1);

  return created[0] || null;
}

async function upsertCustomerFromPortal(cpf: string, accountId: string) {
  console.log(`[Customers][AppPortal] Tentando buscar cliente ${maskCpf(cpf)}`);
  const portalCustomer = await avadminApi.getCustomerById(cpf);
  if (!portalCustomer) {
    console.warn(`[Customers][AppPortal] Cliente ${maskCpf(cpf)} nao encontrado`);
    return null;
  }

  const existing = await db
    .select()
    .from(customers)
    .where(eq(customers.id, cpf))
    .limit(1);

  if (existing.length > 0) {
    console.log(`[Customers][AppPortal] Atualizando cache local de ${maskCpf(cpf)}`);
    await db
      .update(customers)
      .set({
        name: portalCustomer.name,
        whatsapp: portalCustomer.whatsapp || portalCustomer.phone || undefined,
        isActive: true,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, cpf));

    const updated = await db
      .select()
      .from(customers)
      .where(eq(customers.id, cpf))
      .limit(1);

    console.log(`[Customers][AppPortal] Cliente ${maskCpf(cpf)} atualizado com sucesso`);
    return updated[0] || existing[0];
  }

  console.log(`[Customers][AppPortal] Criando cliente local para ${maskCpf(cpf)}`);
  await db.insert(customers).values({
    id: cpf,
    accountId,
    name: portalCustomer.name,
    whatsapp: portalCustomer.whatsapp || portalCustomer.phone || undefined,
    isActive: true,
    lastSyncAt: new Date(),
  });

  const created = await db
    .select()
    .from(customers)
    .where(eq(customers.id, cpf))
    .limit(1);

  console.log(`[Customers][AppPortal] Cliente ${maskCpf(cpf)} criado com sucesso`);
  return created[0] || null;
}

export const customersRouter = router({
  // Cria cliente final no AvAdmin e vincula à conta atual no AxCellOS
  createFinalCustomer: protectedProcedure
    .input(
      z.object({
        fullName: z.string().min(3).max(100),
        cpf: z.string().min(11).max(14),
        whatsapp: z.string().min(10).max(20),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cleanCpf = input.cpf.replace(/\D/g, "");
      const cleanWhatsapp = input.whatsapp.replace(/\D/g, "");

      if (cleanCpf.length !== 11) {
        throw new Error("CPF inválido. Deve conter 11 dígitos.");
      }

      const existing = await avadminApi.getUserByCPF(cleanCpf);

      if (existing) {
        const isFinalCustomer = isEligibleCustomerProfile(existing);

        if (!isFinalCustomer) {
          throw new Error("CPF já vinculado a um usuário que não é cliente final");
        }

        await syncCustomerFromAvAdmin(existing, ctx.accountId!);
        return {
          cpf: existing.cpf,
          full_name: existing.full_name,
          whatsapp: existing.whatsapp,
        };
      }

      const created = await avadminApi.createFinalCustomer({
        full_name: input.fullName.trim(),
        cpf: cleanCpf,
        whatsapp: cleanWhatsapp,
      });

      if (!created) {
        throw new Error("Falha ao criar cliente final no AvAdmin");
      }

      await syncCustomerFromAvAdmin(created, ctx.accountId!);

      return {
        cpf: created.cpf,
        full_name: created.full_name,
        whatsapp: created.whatsapp,
      };
    }),

  // Busca clientes referenciados nesta conta
  getCustomers: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        isActive: z.boolean().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.search) {
        conditions.push(
          or(
            ilike(customers.name, `%${input.search}%`),
            ilike(customers.id, `%${input.search}%`)
          )!
        );
      }

      if (input.isActive !== undefined) {
        conditions.push(eq(customers.isActive, input.isActive));
      }

      const customerList = await db
        .select()
        .from(customers)
        .where(and(...conditions))
        .orderBy(desc(customers.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return customerList;
    }),

  // Busca cliente por ID (CPF)
  getCustomer: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const normalizedId = input.id.replace(/\D/g, "");
      console.log(`[Customers][getCustomer] Inicio da busca para ${maskCpf(normalizedId)}`);
      if (normalizedId.length !== 11) {
        console.warn(`[Customers][getCustomer] CPF invalido recebido: ${input.id}`);
        throw new Error("CPF inválido. Informe 11 dígitos.");
      }

      // Primeiro verifica no banco local
      const localCustomer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, normalizedId))
        .limit(1);

      if (localCustomer.length > 0) {
        if (localCustomer[0].accountId !== ctx.accountId) {
          await db
            .update(customers)
            .set({
              accountId: ctx.accountId!,
              isActive: true,
              lastSyncAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(customers.id, normalizedId));
          console.log(`[Customers][getCustomer] Cliente ${maskCpf(normalizedId)} vinculado automaticamente à loja ${ctx.accountId}`);
        }
        console.log(`[Customers][getCustomer] Cliente ${maskCpf(normalizedId)} encontrado no banco local`);
        return localCustomer[0];
      }

      // Se não encontrado, tenta buscar do AvAdmin e sincronizar
      const avadminUser = await avadminApi.getUserByCPF(normalizedId);
      if (!avadminUser) {
        console.warn(`[Customers][getCustomer] CPF ${maskCpf(normalizedId)} nao encontrado em /user/:cpf`);
      }

      // Aceita cliente das categorias de cliente no banco global.
      if (avadminUser) {
        const clientType = String(avadminUser.client_type || "");
        const isCustomerCategory = isEligibleCustomerProfile(avadminUser);

        if (!isCustomerCategory) {
          console.warn(
            `[Customers][getCustomer] CPF ${maskCpf(normalizedId)} encontrado, mas perfil invalido: client_type=${clientType || "indefinida"} role=${String(avadminUser.role || "indefinida")} account_id=${String(avadminUser.account_id ?? "null")}`
          );
        } else {
          const syncedCustomer = await upsertCustomerLocalByCpf({
            cpf: normalizedId,
            accountId: ctx.accountId!,
            name: avadminUser.full_name?.trim() || undefined,
            whatsapp: avadminUser.whatsapp,
          });

          if (syncedCustomer) {
            console.log(`[Customers][getCustomer] Cliente ${maskCpf(normalizedId)} encontrado via /user/:cpf`);
            return syncedCustomer;
          }
        }
      }

      // Fallback para cliente que se cadastrou no AppPortal.
      const portalCustomer = await upsertCustomerFromPortal(normalizedId, ctx.accountId!);
      if (portalCustomer) {
        console.log(`[Customers][getCustomer] Cliente ${maskCpf(normalizedId)} encontrado via AppPortal`);
        return portalCustomer;
      }

      console.warn(`[Customers][getCustomer] Cliente ${maskCpf(normalizedId)} nao encontrado em nenhuma fonte`);
      throw new Error("Cliente não encontrado");
    }),

  // Referencia um cliente do AvAdmin nesta conta
  // Chamado quando o lojista seleciona um cliente para uma ordem/venda
  linkCustomer: protectedProcedure
    .input(
      z.object({
        customerId: z.string().min(11).max(11), // CPF do cliente
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verifica se já existe
      const existing = await db
        .select()
        .from(customers)
        .where(eq(customers.id, input.customerId))
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }

      // Busca dados do cliente no AvAdmin
      const avadminUser = await avadminApi.getUserByCPF(input.customerId);

      if (!avadminUser) {
        throw new Error("Cliente não encontrado no AvAdmin");
      }

      // Aceita cliente final mesmo quando possui vínculo em outra origem/conta.
      if (!isEligibleCustomerProfile(avadminUser)) {
        throw new Error("Este usuário não é um cliente final");
      }

      // Sincroniza e retorna
      await syncCustomerFromAvAdmin(avadminUser, ctx.accountId!);

      const newCustomer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, input.customerId))
        .limit(1);

      if (newCustomer.length > 0) {
        emitToAccount(ctx.accountId!, "customers:updated", { id: input.customerId, action: "linked" });
        return newCustomer[0];
      }

      // Fallback para cadastro que exista apenas no AppPortal.
      const portalCustomer = await upsertCustomerFromPortal(input.customerId, ctx.accountId!);
      if (portalCustomer) {
        emitToAccount(ctx.accountId!, "customers:updated", { id: input.customerId, action: "linked" });
        return portalCustomer;
      }

      throw new Error("Cliente não encontrado no AvAdmin/AppPortal");
    }),

  // Atualiza observações locais sobre o cliente
  updateCustomerNotes: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await db
        .update(customers)
        .set({
          notes: input.notes,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(customers.id, input.customerId),
            eq(customers.accountId, ctx.accountId!)
          )
        )
        .returning();

      if (updated.length === 0) {
        throw new Error("Cliente não encontrado");
      }

      emitToAccount(ctx.accountId!, "customers:updated", { id: input.customerId, action: "notes" });
      return updated[0];
    }),

  // Desativa referência ao cliente (soft delete)
  unlinkCustomer: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db
        .update(customers)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(customers.id, input.customerId),
            eq(customers.accountId, ctx.accountId!)
          )
        )
        .returning();

      if (deleted.length === 0) {
        throw new Error("Cliente não encontrado");
      }

      emitToAccount(ctx.accountId!, "customers:updated", { id: input.customerId, action: "unlinked" });
      return { success: true };
    }),

  // Busca clientes por nome ou CPF
  searchCustomers: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const customerList = await db
        .select({
          id: customers.id,
          name: customers.name,
          whatsapp: customers.whatsapp,
        })
        .from(customers)
        .where(
          and(
            eq(customers.isActive, true),
            or(
              ilike(customers.name, `%${input.query}%`),
              ilike(customers.id, `%${input.query}%`)
            )
          )
        )
        .orderBy(desc(customers.createdAt))
        .limit(input.limit);

      return customerList;
    }),

  // Sincroniza dados do cliente com AvAdmin
  syncCustomer: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const avadminUser = await avadminApi.getUserByCPF(input.customerId);

      if (!avadminUser) {
        throw new Error("Cliente não encontrado no AvAdmin");
      }

      // FILTRO RIGOROSO: Apenas cliente final SEM account própria
      if (!isEligibleCustomerProfile(avadminUser)) {
        throw new Error("Este usuário não pode ser sincronizado como cliente");
      }

      await syncCustomerFromAvAdmin(avadminUser, ctx.accountId!);

      const synced = await db
        .select()
        .from(customers)
        .where(eq(customers.id, input.customerId))
        .limit(1);

      emitToAccount(ctx.accountId!, "customers:updated", { id: input.customerId, action: "synced" });
      return synced[0];
    }),

  createCustomer: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        name: z.string().optional(),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
        email: z.string().optional(),
        address: z.any().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cleanCpf = input.customerId.replace(/\D/g, "");

      if (cleanCpf.length !== 11) {
        throw new Error("CPF inválido. Deve conter 11 dígitos.");
      }

      const existing = await avadminApi.getUserByCPF(cleanCpf);

      if (existing) {
        const isFinalCustomer = isEligibleCustomerProfile(existing);

        if (!isFinalCustomer) {
          throw new Error("CPF já vinculado a um usuário que não é cliente final");
        }

        await syncCustomerFromAvAdmin(existing, ctx.accountId!);
        emitToAccount(ctx.accountId!, "customers:updated", { id: cleanCpf, action: "created" });
        return {
          cpf: existing.cpf,
          full_name: existing.full_name,
          whatsapp: existing.whatsapp,
        };
      }

      const created = await avadminApi.createFinalCustomer({
        full_name: input.name?.trim() || input.customerId,
        cpf: cleanCpf,
        whatsapp: input.whatsapp || input.phone || "",
      });

      if (!created) {
        throw new Error("Falha ao criar cliente final no AvAdmin");
      }

      await syncCustomerFromAvAdmin(created, ctx.accountId!);
      emitToAccount(ctx.accountId!, "customers:updated", { id: cleanCpf, action: "created" });

      return {
        cpf: created.cpf,
        full_name: created.full_name,
        whatsapp: created.whatsapp,
      };
    }),

  updateCustomer: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        data: z.object({
          name: z.string().optional(),
          phone: z.string().optional(),
          whatsapp: z.string().optional(),
          email: z.string().optional(),
          address: z.any().optional(),
          isActive: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await db
        .update(customers)
        .set({
          name: input.data.name,
          whatsapp: input.data.whatsapp || input.data.phone,
          notes: input.data.email ? `Email: ${input.data.email}` : undefined,
          isActive: input.data.isActive,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(customers.id, input.customerId),
            eq(customers.accountId, ctx.accountId!)
          )
        )
        .returning();

      if (updated.length === 0) {
        throw new Error("Cliente não encontrado");
      }

      emitToAccount(ctx.accountId!, "customers:updated", { id: input.customerId, action: "updated" });
      return updated[0];
    }),
});
