import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getPendingDeliveryOrders,
  assignDelivererToOrder,
  updateOrderDeliveryStatus,
} from "../db-helpers";

export const ordersRouter = router({
  // Listar todos os pedidos pendentes de entrega
  listPendingDeliveries: protectedProcedure.query(async () => {
    return await getPendingDeliveryOrders();
  }),

  // Atribuir entregador a um pedido
  assignDeliverer: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        orderType: z.enum(["sale", "public_order"]),
        delivererId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await assignDelivererToOrder(
        input.orderId,
        input.orderType,
        input.delivererId
      );
    }),

  // Atualizar status de entrega do pedido
  updateDeliveryStatus: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        orderType: z.enum(["sale", "public_order"]),
        status: z.enum(["pending", "in_transit", "delivered"]),
      })
    )
    .mutation(async ({ input }) => {
      return await updateOrderDeliveryStatus(
        input.orderId,
        input.orderType,
        input.status
      );
    }),
});
