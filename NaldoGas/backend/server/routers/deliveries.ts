import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as dbHelpers from "../db-helpers";

export const deliveriesRouter = router({
  list: protectedProcedure.query(async () => {
    return dbHelpers.getPendingSalesByStatus("pending");
  }),

  create: protectedProcedure
    .input(
      z.object({
        saleId: z.number(),
        customerId: z.number(),
        deliveryAddress: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return dbHelpers.createPendingSale({
        saleId: input.saleId,
        customerId: input.customerId,
        deliveryAddress: input.deliveryAddress,
        notes: input.notes,
        status: "pending",
      });
    }),

  assignToDeliverer: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        delivererId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return dbHelpers.updatePendingSale(input.id, {
        delivererId: input.delivererId,
        status: "in_transit",
      });
    }),

  getByDeliverer: protectedProcedure
    .input(z.object({ delivererId: z.number() }))
    .query(async ({ input }) => {
      return dbHelpers.getPendingSalesByDeliverer(input.delivererId);
    }),

  getByStatus: protectedProcedure
    .input(z.object({ status: z.enum(["pending", "in_transit", "delivered", "cancelled"]) }))
    .query(async ({ input }) => {
      return dbHelpers.getPendingSalesByStatus(input.status);
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "in_transit", "delivered", "cancelled"]),
      })
    )
    .mutation(async ({ input }) => {
      return dbHelpers.updatePendingSale(input.id, {
        status: input.status,
      });
    }),
});
