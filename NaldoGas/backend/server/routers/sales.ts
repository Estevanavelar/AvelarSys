import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as dbHelpers from "../db-helpers";
import { sendSaleNotification } from "../whatsapp-sender";

// Funcao auxiliar para enviar notificacao via WhatsApp
async function sendWhatsAppNotification(saleData: any) {
  try {
    // Aqui voce integraria com o Baileys para enviar a mensagem
    // Por enquanto, apenas logamos
    console.log("[WhatsApp] Enviando notificacao de venda:", saleData);
    // Em producao:
    // await sendWhatsAppMessage({
    //   to: config.notificationPhoneNumber,
    //   message: formatMessage(template, saleData)
    // });
  } catch (error) {
    console.error("[WhatsApp] Erro ao enviar notificacao:", error);
  }
}

export const salesRouter = router({
  searchCustomer: protectedProcedure
    .input(
      z.object({
        cpf: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      // Buscar cliente por CPF
      if (input.cpf) {
        const customer = await dbHelpers.getCustomerByCPF(input.cpf);
        if (customer) return customer;
      }

      // Buscar cliente por telefone
      if (input.phone) {
        const customer = await dbHelpers.getCustomerByPhone(input.phone);
        if (customer) return customer;
      }

      return null;
    }),

  createQuickCustomer: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        phone: z.string(),
        cpf: z.string().optional(),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await dbHelpers.createCustomer({
        name: input.name,
        phone: input.phone,
        cpf: input.cpf,
        address: input.address,
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        customerId: z.number().optional(),
        totalAmount: z.string(),
        discount: z.string().optional(),
        paymentMethod: z.enum(["cash", "credit_card", "debit_card", "pix", "credit"]),
        salesChannel: z.enum(["portaria", "telegas", "whatsapp"]).default("portaria"),
        containerExchanged: z.boolean().default(true),
        containerOwed: z.number().default(0),
        items: z.array(
          z.object({
            productId: z.number(),
            quantity: z.number(),
            unitPrice: z.string(),
            subtotal: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Criar venda
      const sale = await dbHelpers.createSale({
        customerId: input.customerId,
        vendorId: ctx.user.id,
        totalAmount: input.totalAmount,
        discount: input.discount,
        paymentMethod: input.paymentMethod,
        salesChannel: input.salesChannel,
        containerExchanged: input.containerExchanged,
        containerOwed: input.containerOwed,
        status: "completed",
      });

      // Criar itens da venda
      for (const item of input.items) {
        await dbHelpers.createSaleItem({
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        });

        // Atualizar estoque
        const inventory = await dbHelpers.getInventoryByProductId(item.productId);
        if (inventory && inventory.quantity !== null) {
          await dbHelpers.updateInventoryQuantity(
            item.productId,
            inventory.quantity - item.quantity
          );
        }
      }

      // Se for fiado, criar conta a receber
      if (input.paymentMethod === "credit" && input.customerId) {
        await dbHelpers.createReceivable({
          customerId: input.customerId,
          saleId: sale.id,
          totalAmount: input.totalAmount,
          paidAmount: "0",
          status: "pending",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        });
      }

      // Enviar notificacao WhatsApp
      if (input.customerId) {
        const customer = await dbHelpers.getCustomerById(input.customerId);
        if (customer && customer.phone) {
          const productList = input.items
            .map((item) => `Produto ${item.productId} (${item.quantity}x)`)
            .join(", ");
          
          await sendSaleNotification(
            customer.phone,
            customer.name || "Cliente",
            input.totalAmount,
            productList,
            input.paymentMethod,
            input.salesChannel
          );
        }
      }

      return sale;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const sale = await dbHelpers.getSaleById(input.id);
      if (!sale) return null;

      const items = await dbHelpers.getSaleItems(input.id);
      return { ...sale, items };
    }),

  getByDateRange: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      return dbHelpers.getSalesByDateRange(input.startDate, input.endDate);
    }),
});
