import { router, protectedProcedure } from "../lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../db";
import { products } from "../db/schema";
import { eq, and, ilike, desc, ne } from "drizzle-orm";
import { emitToAccount } from "../lib/socket";

function requireTenantContext(ctx: {
  account?: { owner_cpf?: string };
  accountId?: string;
}) {
  if (!ctx.account?.owner_cpf || !ctx.accountId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Contexto de autenticação inválido",
    });
  }

  return {
    ownerCpf: ctx.account.owner_cpf,
    accountId: ctx.accountId,
  };
}

export const productsRouter = router({
  // Get all products for account
  getProducts: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        isActive: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { ownerCpf } = requireTenantContext(ctx);
      
      const conditions = [eq(products.ownerCpf, ownerCpf)];

      if (input.search) {
        conditions.push(
          ilike(products.name, `%${input.search}%`)
        );
      }

      if (input.category) {
        conditions.push(eq(products.category, input.category));
      }

      if (input.isActive !== undefined) {
        conditions.push(eq(products.isActive, input.isActive));
      }

      const productList = await db
        .select()
        .from(products)
        .where(and(...conditions))
        .orderBy(desc(products.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return productList;
    }),

  // Get product by ID
  getProduct: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { ownerCpf } = requireTenantContext(ctx);

      const product = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, input.id),
            eq(products.ownerCpf, ownerCpf)
          )
        )
        .limit(1);

      if (product.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Produto não encontrado",
        });
      }

      return product[0];
    }),

  // Create product
  createProduct: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        sku: z.string().optional(),
        barcode: z.string().optional(),
        price: z.number().min(0),
        costPrice: z.number().optional(),
        category: z.string().optional(),
        unit: z.string().default("unidade"),
        stock: z.number().min(0).default(0),
        minStock: z.number().min(0).default(0),
        maxStock: z.number().optional(),
        isActive: z.boolean().default(true),
        imageUrl: z.string().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { ownerCpf, accountId } = requireTenantContext(ctx);

      if (input.sku) {
        const existing = await db
          .select({ id: products.id })
          .from(products)
          .where(
            and(
              eq(products.ownerCpf, ownerCpf),
              eq(products.sku, input.sku)
            )
          )
          .limit(1);
        if (existing.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Já existe um produto com o SKU "${input.sku}"`,
          });
        }
      }

      const newProduct = await db
        .insert(products)
        .values({
          ...input,
          price: input.price.toString(),
          costPrice: input.costPrice?.toString(),
          accountId,
          ownerCpf,
        })
        .returning();

      emitToAccount(accountId, "products:updated", { id: newProduct[0].id, action: "created" });
      return newProduct[0];
    }),

  // Update product
  updateProduct: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: z.object({
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          sku: z.string().optional(),
          barcode: z.string().optional(),
          price: z.number().min(0).optional(),
          costPrice: z.number().optional(),
          category: z.string().optional(),
          unit: z.string().optional(),
          stock: z.number().min(0).optional(),
          minStock: z.number().min(0).optional(),
          maxStock: z.number().optional(),
          isActive: z.boolean().optional(),
          imageUrl: z.string().optional(),
          metadata: z.any().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { ownerCpf, accountId } = requireTenantContext(ctx);

      if (input.data.sku) {
        const existing = await db
          .select({ id: products.id })
          .from(products)
          .where(
            and(
              eq(products.ownerCpf, ownerCpf),
              eq(products.sku, input.data.sku),
              ne(products.id, input.id)
            )
          )
          .limit(1);
        if (existing.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Já existe um produto com o SKU "${input.data.sku}"`,
          });
        }
      }

      const updateData: any = { ...input.data, updatedAt: new Date() };
      if (input.data.price !== undefined) {
        updateData.price = input.data.price.toString();
      }
      if (input.data.costPrice !== undefined) {
        updateData.costPrice = input.data.costPrice.toString();
      }

      const updatedProduct = await db
        .update(products)
        .set(updateData)
        .where(
          and(
            eq(products.id, input.id),
            eq(products.ownerCpf, ownerCpf)
          )
        )
        .returning();

      if (updatedProduct.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Produto não encontrado",
        });
      }

      emitToAccount(accountId, "products:updated", { id: input.id, action: "updated" });
      return updatedProduct[0];
    }),

  // Delete product (soft delete by setting isActive to false)
  deleteProduct: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { ownerCpf, accountId } = requireTenantContext(ctx);

      const deletedProduct = await db
        .update(products)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(products.id, input.id),
            eq(products.ownerCpf, ownerCpf)
          )
        )
        .returning();

      if (deletedProduct.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Produto não encontrado",
        });
      }

      emitToAccount(accountId, "products:updated", { id: input.id, action: "deleted" });
      return { success: true };
    }),

  // Get categories
  getCategories: protectedProcedure
    .query(async ({ ctx }) => {
      const { ownerCpf } = requireTenantContext(ctx);

      const categories = await db
        .selectDistinct({
          category: products.category,
        })
        .from(products)
        .where(
          and(
            eq(products.ownerCpf, ownerCpf),
            eq(products.isActive, true)
          )
        );

      return categories
        .map(c => c.category)
        .filter(Boolean)
        .sort();
    }),

  // Update stock
  updateStock: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        stock: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { ownerCpf, accountId } = requireTenantContext(ctx);

      const updatedProduct = await db
        .update(products)
        .set({
          stock: input.stock,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(products.id, input.id),
            eq(products.ownerCpf, ownerCpf)
          )
        )
        .returning();

      if (updatedProduct.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Produto não encontrado",
        });
      }

      emitToAccount(accountId, "products:updated", { id: input.id, action: "stock" });
      return updatedProduct[0];
    }),
});