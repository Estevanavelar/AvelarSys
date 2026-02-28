import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  initializeBaileys,
  sendMessage,
  getConnectionStatus,
  getQRCode,
  disconnectWhatsApp,
  isConnected,
} from "../baileys-manager";

export const whatsappBaileysRouter = router({
  // Conectar WhatsApp
  connect: publicProcedure.mutation(async () => {
    try {
      await initializeBaileys();
      const status = getConnectionStatus();
      return {
        success: true,
        status: status.status,
        qrCode: status.qrCode,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao conectar",
      };
    }
  }),

  // Obter status de conexão
  getStatus: publicProcedure.query(async () => {
    const status = getConnectionStatus();
    return {
      status: status.status,
      isConnecting: status.isConnecting,
      qrCode: status.qrCode,
      isConnected: isConnected(),
    };
  }),

  // Obter QR Code
  getQRCode: publicProcedure.query(async () => {
    const qrCode = getQRCode();
    return {
      qrCode,
    };
  }),

  // Desconectar WhatsApp
  disconnect: publicProcedure.mutation(async () => {
    try {
      await disconnectWhatsApp();
      return {
        success: true,
        message: "WhatsApp desconectado com sucesso",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao desconectar",
      };
    }
  }),

  // Enviar mensagem de teste
  sendTestMessage: publicProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        if (!isConnected()) {
          throw new Error("WhatsApp não está conectado");
        }

        await sendMessage(input.phoneNumber, input.message);
        return {
          success: true,
          message: "Mensagem enviada com sucesso",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro ao enviar mensagem",
        };
      }
    }),
});
