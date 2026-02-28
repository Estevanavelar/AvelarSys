import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as dbHelpers from "../db-helpers";

export const cashRegisterRouter = router({
  // Abertura de caixa
  open: protectedProcedure
    .input(
      z.object({
        cashAmount: z.string(),
        cardAmount: z.string(),
        pixAmount: z.string(),
        creditAmount: z.string(),
        fullContainersPhysical: z.number(),
        emptyContainersPhysical: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      return await dbHelpers.openCashRegister({
        userId: ctx.user.id,
        ...input,
      });
    }),

  // Fechamento de caixa
  close: protectedProcedure
    .input(
      z.object({
        cashAmount: z.string(),
        cardAmount: z.string(),
        pixAmount: z.string(),
        creditAmount: z.string(),
        totalSales: z.string(),
        fullContainersPhysical: z.number(),
        emptyContainersPhysical: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      return await dbHelpers.closeCashRegister({
        userId: ctx.user.id,
        ...input,
      });
    }),

  // Obter sessões de hoje
  getTodaySessions: protectedProcedure.query(async () => {
    return await dbHelpers.getTodayCashRegisterSessions();
  }),

  // Obter última sessão
  getLastSession: protectedProcedure.query(async () => {
    return await dbHelpers.getLastCashRegisterSession();
  }),

  // Obter histórico
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => {
      return await dbHelpers.getCashRegisterHistory(input.limit);
    }),
});
