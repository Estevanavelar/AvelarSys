import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as dbHelpers from "../db-helpers";

export const financialRouter = router({
  // Contas a Receber (Fiados)
  receivables: router({
    list: protectedProcedure.query(async () => {
      return dbHelpers.getReceivablesByStatus("pending");
    }),

    getByCustomer: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ input }) => {
        return dbHelpers.getReceivablesByCustomerId(input.customerId);
      }),

    getByStatus: protectedProcedure
      .input(z.object({ status: z.enum(["pending", "partial", "paid", "overdue"]) }))
      .query(async ({ input }) => {
        return dbHelpers.getReceivablesByStatus(input.status);
      }),

    payFull: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return dbHelpers.updateReceivable(input.id, {
          status: "paid",
          paidAmount: (await dbHelpers.getReceivablesByStatus("paid")).find(
            (r) => r.id === input.id
          )?.totalAmount,
        });
      }),

    payPartial: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          amount: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        // Implementar lógica de pagamento parcial
        return dbHelpers.updateReceivable(input.id, {
          status: "partial",
        });
      }),
  }),

  // Contas a Pagar
  payables: router({
    list: protectedProcedure.query(async () => {
      return dbHelpers.getPayables();
    }),

    create: protectedProcedure
      .input(
        z.object({
          description: z.string().min(1),
          amount: z.string(),
          category: z.string().optional(),
          dueDate: z.date(),
        })
      )
      .mutation(async ({ input }) => {
        return dbHelpers.createPayable({
          description: input.description,
          amount: input.amount,
          category: input.category,
          dueDate: input.dueDate,
          status: "pending",
        });
      }),

    getByStatus: protectedProcedure
      .input(z.object({ status: z.enum(["pending", "paid"]) }))
      .query(async ({ input }) => {
        return dbHelpers.getPayablesByStatus(input.status);
      }),

    markAsPaid: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return dbHelpers.updatePayable(input.id, {
          status: "paid",
          paidDate: new Date(),
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          description: z.string().optional(),
          amount: z.string().optional(),
          category: z.string().optional(),
          dueDate: z.date().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return dbHelpers.updatePayable(id, data);
      }),
  }),
});
