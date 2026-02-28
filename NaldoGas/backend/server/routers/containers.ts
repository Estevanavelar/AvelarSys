import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as dbHelpers from "../db-helpers";

export const containersRouter = router({
  list: protectedProcedure.query(async () => {
    return await dbHelpers.getContainers();
  }),

  getByStatus: protectedProcedure
    .input(z.object({ status: z.enum(["full", "empty", "customer_possession"]) }))
    .query(async ({ input }) => {
      return await dbHelpers.getContainersByStatus(input.status);
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["full", "empty", "customer_possession"]),
        customerId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await dbHelpers.updateContainerStatus(input.id, input.status, input.customerId);
    }),
});
