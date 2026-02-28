import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  getPublicProducts,
  createPublicOrder,
  getPublicOrders,
  validateCoupon,
  applyCoupon,
  createCoupon,
  getCoupons,
  updateCouponStatus,
  getCatalogSettings,
  updateCatalogSettings,
  updatePublicOrderStatus,
} from "../db-helpers";

export const publicCatalogRouter = router({
  // Público: Listar produtos disponíveis
  listProducts: publicProcedure.query(async () => {
    return await getPublicProducts();
  }),

  // Público: Validar cupom de desconto
  validateCoupon: publicProcedure
    .input(
      z.object({
        code: z.string(),
        purchaseAmount: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await validateCoupon(input.code, input.purchaseAmount);
    }),

  // Público: Criar pedido
  createOrder: publicProcedure
    .input(
      z.object({
        customerName: z.string(),
        customerPhone: z.string(),
        customerEmail: z.string().optional(),
        items: z.array(
          z.object({
            productId: z.number(),
            productName: z.string(),
            quantity: z.number(),
            unitPrice: z.string(),
            subtotal: z.string(),
          })
        ),
        subtotal: z.string(),
        discount: z.string(),
        total: z.string(),
        couponCode: z.string().optional(),
        deliveryAddress: z.object({
          street: z.string(),
          number: z.string(),
          complement: z.string().optional(),
          neighborhood: z.string(),
          city: z.string(),
          state: z.string(),
          zipCode: z.string(),
        }),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const order = await createPublicOrder(input);

      // Aplicar cupom se fornecido
      if (input.couponCode) {
        await applyCoupon(input.couponCode);
      }

      return order;
    }),

  // Admin: Listar todos os pedidos
  listOrders: protectedProcedure.query(async () => {
    return await getPublicOrders();
  }),

  // Admin: Criar cupom
  createCoupon: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        discountType: z.enum(["percentage", "fixed_amount"]),
        discountValue: z.string(),
        minPurchaseAmount: z.string().optional(),
        maxUses: z.number().optional(),
        validFrom: z.date(),
        validUntil: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      return await createCoupon(input);
    }),

  // Admin: Listar cupons
  listCoupons: protectedProcedure.query(async () => {
    return await getCoupons();
  }),

  // Admin: Ativar/desativar cupom
  toggleCoupon: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await updateCouponStatus(input.id, input.isActive);
      return { success: true };
    }),

  // Admin: Obter configurações do catálogo
  getSettings: protectedProcedure.query(async () => {
    return await getCatalogSettings();
  }),

  // Admin: Atualizar configurações do catálogo
  updateSettings: protectedProcedure
    .input(
      z.object({
        whatsappNumber: z.string().optional(),
        defaultMessage: z.string().optional(),
        cloudflareApiToken: z.string().optional(),
        cloudflareZoneId: z.string().optional(),
        customDomain: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await updateCatalogSettings(input);
    }),

  // Admin: Atualizar status do pedido
  updateOrderStatus: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        status: z.enum(["pending", "processing", "in_transit", "delivered", "cancelled"]),
      })
    )
    .mutation(async ({ input }) => {
      return await updatePublicOrderStatus(input.orderId, input.status);
    }),

  // Público: Obter número do WhatsApp
  getWhatsappNumber: publicProcedure.query(async () => {
    const settings = await getCatalogSettings();
    return { whatsappNumber: settings?.whatsappNumber || "5511999999999" };
  }),
});
