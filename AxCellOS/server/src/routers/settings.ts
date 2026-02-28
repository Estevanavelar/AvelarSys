/**
 * Router de Settings (Configurações) - AxCellOS
 * 
 * Configurações do sistema por conta (multi-tenant).
 * - accountId: CNPJ do lojista
 * - key: chave única da configuração
 * - value: valor JSON arbitrário
 */

import { router, protectedProcedure } from "../lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../db";
import { settings, users, warrantyTerms } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

const WARRANTY_TERM_ID_LENGTH = 10;
const WARRANTY_TERM_ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generateWarrantyTermId() {
  let id = "";
  for (let i = 0; i < WARRANTY_TERM_ID_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * WARRANTY_TERM_ID_ALPHABET.length);
    id += WARRANTY_TERM_ID_ALPHABET[index];
  }
  return id;
}

export const settingsRouter = router({
  /** Busca perfil da empresa do banco Neon (tabela users sync AvAdmin) */
  getAccountProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const account = await db
        .select({
          businessName: users.businessName,
          companyName: users.companyName,
          document: users.document,
          whatsapp: users.whatsapp,
          address: users.address,
          city: users.city,
          state: users.state,
          zipCode: users.zipCode,
        })
        .from(users)
        .where(eq(users.id, ctx.accountId!))
        .limit(1);

      const row = account[0];
      if (!row) return null;

      return {
        name: row.businessName || row.companyName || '',
        cnpj: row.document || '',
        phone: row.whatsapp || '',
        address: row.address || '',
        city: row.city || '',
        state: row.state || '',
        zipCode: row.zipCode || '',
        email: '',
      };
    }),

  getSettings: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(settings.accountId, ctx.accountId!),
      ];

      if (input.category) {
        conditions.push(eq(settings.category, input.category));
      }

      const settingsList = await db
        .select()
        .from(settings)
        .where(and(...conditions));

      return settingsList;
    }),

  getSetting: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const setting = await db
        .select()
        .from(settings)
        .where(
          and(
            eq(settings.accountId, ctx.accountId!),
            eq(settings.key, input.key)
          )
        )
        .limit(1);

      return setting[0] || null;
    }),

  setSetting: protectedProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.any(),
        category: z.string().optional(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingSetting = await db
        .select()
        .from(settings)
        .where(
          and(
            eq(settings.accountId, ctx.accountId!),
            eq(settings.key, input.key)
          )
        )
        .limit(1);

      if (existingSetting.length > 0) {
        const updated = await db
          .update(settings)
          .set({
            value: input.value,
            category: input.category,
            isPublic: input.isPublic,
            updatedAt: new Date(),
          })
          .where(eq(settings.id, existingSetting[0].id))
          .returning();

        return updated[0];
      }

      const created = await db
        .insert(settings)
        .values({
          accountId: ctx.accountId!,
          key: input.key,
          value: input.value,
          category: input.category,
          isPublic: input.isPublic,
        })
        .returning();

      return created[0];
    }),

  deleteSetting: protectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db
        .delete(settings)
        .where(
          and(
            eq(settings.accountId, ctx.accountId!),
            eq(settings.key, input.key)
          )
        )
        .returning();

      if (deleted.length === 0) {
        throw new Error("Configuração não encontrada");
      }

      return { success: true };
    }),

  setFees: protectedProcedure
    .input(
      z.object({
        debit: z.number().min(0).max(100),
        credit1x: z.number().min(0).max(100),
        installments: z.record(z.number().min(0).max(100)),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db
        .select()
        .from(settings)
        .where(
          and(
            eq(settings.accountId, ctx.accountId!),
            eq(settings.key, "fees")
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const updated = await db
          .update(settings)
          .set({
            value: input,
            updatedAt: new Date(),
          })
          .where(eq(settings.id, existing[0].id))
          .returning();

        return updated[0];
      }

      const created = await db
        .insert(settings)
        .values({
          accountId: ctx.accountId!,
          key: "fees",
          value: input,
          category: "payment",
        })
        .returning();

      return created[0];
    }),

  setCompany: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        cnpj: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        website: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db
        .select()
        .from(settings)
        .where(
          and(
            eq(settings.accountId, ctx.accountId!),
            eq(settings.key, "company")
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const current = existing[0].value as Record<string, unknown>;
        const updated = await db
          .update(settings)
          .set({
            value: { ...current, ...input },
            updatedAt: new Date(),
          })
          .where(eq(settings.id, existing[0].id))
          .returning();

        return updated[0];
      }

      const created = await db
        .insert(settings)
        .values({
          accountId: ctx.accountId!,
          key: "company",
          value: input,
          category: "profile",
        })
        .returning();

      return created[0];
    }),

  setNotifications: protectedProcedure
    .input(
      z.object({
        newOrder: z.boolean().optional(),
        orderStatus: z.boolean().optional(),
        dailyReport: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db
        .select()
        .from(settings)
        .where(
          and(
            eq(settings.accountId, ctx.accountId!),
            eq(settings.key, "notifications")
          )
        )
        .limit(1);

      const defaultNotifications = {
        newOrder: true,
        orderStatus: true,
        dailyReport: false,
      };

      if (existing.length > 0) {
        const current = existing[0].value as Record<string, unknown>;
        const updated = await db
          .update(settings)
          .set({
            value: { ...defaultNotifications, ...current, ...input },
            updatedAt: new Date(),
          })
          .where(eq(settings.id, existing[0].id))
          .returning();

        return updated[0];
      }

      const created = await db
        .insert(settings)
        .values({
          accountId: ctx.accountId!,
          key: "notifications",
          value: { ...defaultNotifications, ...input },
          category: "notifications",
        })
        .returning();

      return created[0];
    }),

  getWarrantyTerms: protectedProcedure
    .query(async ({ ctx }) => {
      return db
        .select()
        .from(warrantyTerms)
        .where(
          and(
            eq(warrantyTerms.accountId, ctx.accountId!),
            eq(warrantyTerms.isActive, true)
          )
        )
        .orderBy(desc(warrantyTerms.createdAt));
    }),

  createWarrantyTerm: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(255),
        content: z.string().trim().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.accountId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Contexto de autenticação inválido",
        });
      }
      const ownerCpf = ctx.account?.owner_cpf ?? (ctx.user as { cpf?: string })?.cpf ?? "";
      if (!ownerCpf) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "CPF do responsável não disponível",
        });
      }

      // Garante que existe registro em users (evita FK violation se sync não rodou)
      const { ensureUserExists } = await import("../services/sync");
      await ensureUserExists(ctx.accountId, ownerCpf);

      let termId = "";
      for (let i = 0; i < 10; i += 1) {
        const candidate = generateWarrantyTermId();
        const existing = await db
          .select({ id: warrantyTerms.id })
          .from(warrantyTerms)
          .where(eq(warrantyTerms.id, candidate))
          .limit(1);
        if (existing.length === 0) {
          termId = candidate;
          break;
        }
      }

      if (!termId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível gerar um ID único para o termo",
        });
      }

      const created = await db
        .insert(warrantyTerms)
        .values({
          id: termId,
          accountId: ctx.accountId,
          ownerCpf,
          title: input.title,
          content: input.content,
        })
        .returning();

      return created[0];
    }),

  updateWarrantyTerm: protectedProcedure
    .input(
      z.object({
        id: z
          .string()
          .trim()
          .regex(/^[A-Z]{10}$/),
        title: z.string().trim().min(1).max(255).optional(),
        content: z.string().trim().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await db
        .update(warrantyTerms)
        .set({
          title: input.title,
          content: input.content,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(warrantyTerms.id, input.id),
            eq(warrantyTerms.accountId, ctx.accountId!),
            eq(warrantyTerms.isActive, true)
          )
        )
        .returning();

      if (updated.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Termo de garantia não encontrado",
        });
      }

      return updated[0];
    }),

  deleteWarrantyTerm: protectedProcedure
    .input(
      z.object({
        id: z
          .string()
          .trim()
          .regex(/^[A-Z]{10}$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const deleted = await db
        .update(warrantyTerms)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(warrantyTerms.id, input.id),
            eq(warrantyTerms.accountId, ctx.accountId!),
            eq(warrantyTerms.isActive, true)
          )
        )
        .returning();

      if (deleted.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Termo de garantia não encontrado",
        });
      }

      return { success: true };
    }),
});
