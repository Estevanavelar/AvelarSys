import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as dbHelpers from "../db-helpers";

export const whatsappConfigRouter = router({
  // Obter configuração de WhatsApp
  getConfig: protectedProcedure.query(async () => {
    return await dbHelpers.getWhatsappConfig();
  }),

  // Atualizar configuração de WhatsApp
  updateConfig: protectedProcedure
    .input(
      z.object({
        businessPhoneNumber: z.string().optional(),
        notificationPhoneNumber: z.string().optional(),
        isEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await dbHelpers.updateWhatsappConfig(input);
    }),

  // Obter todos os templates de mensagens
  getMessageTemplates: protectedProcedure.query(async () => {
    return await dbHelpers.getWhatsappMessageTemplates();
  }),

  // Obter template por tipo
  getMessageTemplateByType: protectedProcedure
    .input(z.object({ templateType: z.string() }))
    .query(async ({ input }) => {
      return await dbHelpers.getWhatsappMessageTemplateByType(input.templateType);
    }),

  // Criar novo template
  createMessageTemplate: protectedProcedure
    .input(
      z.object({
        templateType: z.string(),
        title: z.string(),
        messageContent: z.string(),
        variables: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await dbHelpers.createWhatsappMessageTemplate(input);
    }),

  // Atualizar template
  updateMessageTemplate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        templateType: z.string().optional(),
        title: z.string().optional(),
        messageContent: z.string().optional(),
        variables: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await dbHelpers.updateWhatsappMessageTemplate(id, data);
    }),

  // Deletar template
  deleteMessageTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await dbHelpers.deleteWhatsappMessageTemplate(input.id);
      return { success: true };
    }),
});
