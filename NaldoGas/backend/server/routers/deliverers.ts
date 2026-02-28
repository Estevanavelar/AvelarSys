import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createDeliverer,
  getDeliverers,
  getActiveDeliverers,
  getDelivererById,
  updateDeliverer,
  deleteDeliverer,
  toggleDelivererStatus,
} from "../db-helpers";

export const deliverersRouter = router({
  // Listar todos os entregadores
  list: protectedProcedure.query(async () => {
    return await getDeliverers();
  }),

  // Listar apenas entregadores ativos
  listActive: protectedProcedure.query(async () => {
    return await getActiveDeliverers();
  }),

  // Buscar entregador por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getDelivererById(input.id);
    }),

  // Criar novo entregador
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        phone: z.string().min(1, "Telefone é obrigatório"),
        isActive: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ input }) => {
      return await createDeliverer(input);
    }),

  // Atualizar entregador
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await updateDeliverer(id, data);
    }),

  // Deletar entregador
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteDeliverer(input.id);
      return { success: true };
    }),

  // Ativar/Desativar entregador
  toggleStatus: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await toggleDelivererStatus(input.id);
    }),
});
