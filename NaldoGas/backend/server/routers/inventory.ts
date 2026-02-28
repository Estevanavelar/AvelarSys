import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as dbHelpers from "../db-helpers";

export const inventoryRouter = router({
  list: protectedProcedure.query(async () => {
    return await dbHelpers.getInventory();
  }),

  getByProductId: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      return await dbHelpers.getInventoryByProductId(input.productId);
    }),

  update: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        quantity: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await dbHelpers.updateInventoryQuantity(input.productId, input.quantity);
    }),
});
