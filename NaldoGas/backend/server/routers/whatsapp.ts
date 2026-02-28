import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  initializeWhatsApp,
  sendMessage,
  sendSaleNotification,
  sendDeliveryNotification,
  sendOverdueNotification,
  sendLowStockNotification,
  sendContainerReturnNotification,
  getConnectionStatus,
  disconnectWhatsApp,
} from "../whatsapp";

/**
 * Router de WhatsApp
 * Integração com Baileys para envio de notificações via WhatsApp
 */

export const whatsappRouter = router({
  /**
   * Conectar ao WhatsApp
   */
  connect: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const sock = await initializeWhatsApp();
      return {
        success: true,
        message: "Escaneie o QR Code com seu celular",
      };
    } catch (error) {
      throw new Error("Erro ao conectar WhatsApp");
    }
  }),

  /**
   * Obter status da conexão
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    return getConnectionStatus();
  }),

  /**
   * Enviar mensagem de teste
   */
  sendTestMessage: protectedProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await sendMessage(input.phoneNumber, input.message);
        return {
          success: true,
          messageId: result.messageId,
          message: "Mensagem enviada com sucesso",
        };
      } catch (error) {
        throw new Error("Erro ao enviar mensagem");
      }
    }),

  /**
   * Enviar notificação de venda
   */
  sendSaleNotification: protectedProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        customerName: z.string(),
        amount: z.number(),
        items: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await sendSaleNotification(
          input.phoneNumber,
          input.customerName,
          input.amount,
          input.items
        );
        return {
          success: true,
          messageId: result.messageId,
          message: "Notificação de venda enviada",
        };
      } catch (error) {
        throw new Error("Erro ao enviar notificação de venda");
      }
    }),

  /**
   * Enviar notificação de entrega
   */
  sendDeliveryNotification: protectedProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        customerName: z.string(),
        address: z.string(),
        estimatedTime: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await sendDeliveryNotification(
          input.phoneNumber,
          input.customerName,
          input.address,
          input.estimatedTime
        );
        return {
          success: true,
          messageId: result.messageId,
          message: "Notificação de entrega enviada",
        };
      } catch (error) {
        throw new Error("Erro ao enviar notificação de entrega");
      }
    }),

  /**
   * Enviar notificação de fiado vencido
   */
  sendOverdueNotification: protectedProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        customerName: z.string(),
        amount: z.number(),
        daysOverdue: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await sendOverdueNotification(
          input.phoneNumber,
          input.customerName,
          input.amount,
          input.daysOverdue
        );
        return {
          success: true,
          messageId: result.messageId,
          message: "Notificação de fiado vencido enviada",
        };
      } catch (error) {
        throw new Error("Erro ao enviar notificação de fiado vencido");
      }
    }),

  /**
   * Enviar notificação de estoque baixo
   */
  sendLowStockNotification: protectedProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        productName: z.string(),
        quantity: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await sendLowStockNotification(
          input.phoneNumber,
          input.productName,
          input.quantity
        );
        return {
          success: true,
          messageId: result.messageId,
          message: "Notificação de estoque baixo enviada",
        };
      } catch (error) {
        throw new Error("Erro ao enviar notificação de estoque baixo");
      }
    }),

  /**
   * Enviar notificação de devolução de vasilhame vencida
   */
  sendContainerReturnNotification: protectedProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        customerName: z.string(),
        daysOverdue: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await sendContainerReturnNotification(
          input.phoneNumber,
          input.customerName,
          input.daysOverdue
        );
        return {
          success: true,
          messageId: result.messageId,
          message: "Notificação de devolução vencida enviada",
        };
      } catch (error) {
        throw new Error("Erro ao enviar notificação de devolução vencida");
      }
    }),

  /**
   * Desconectar do WhatsApp
   */
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await disconnectWhatsApp();
      return {
        success: true,
        message: "Desconectado com sucesso",
      };
    } catch (error) {
      throw new Error("Erro ao desconectar");
    }
  }),
});
