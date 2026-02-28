import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as dbHelpers from "../db-helpers";

export const productsRouter = router({
  list: protectedProcedure.query(async () => {
    return dbHelpers.getProducts();
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        sku: z.string().optional(),
        salePrice: z.string().optional(), // Deprecated
        costPrice: z.string(),
        priceCash: z.string().optional(), // Preço PIX/Dinheiro
        priceCard: z.string().optional(), // Preço Cartão
        minStock: z.number().optional(),
        isContainer: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return dbHelpers.createProduct({
        name: input.name,
        description: input.description,
        sku: input.sku,
        salePrice: input.salePrice || input.priceCard || input.priceCash || "0",
        costPrice: input.costPrice,
        priceCash: input.priceCash,
        priceCard: input.priceCard,
        minStock: input.minStock,
        isContainer: input.isContainer,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return dbHelpers.getProductById(input.id);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        salePrice: z.string().optional(), // Deprecated
        costPrice: z.string().optional(),
        priceCash: z.string().optional(), // Preço PIX/Dinheiro
        priceCard: z.string().optional(), // Preço Cartão
        minStock: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return dbHelpers.updateProduct(id, data);
    }),
});
