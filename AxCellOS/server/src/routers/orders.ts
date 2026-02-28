/**
 * Router de Orders (Ordens de Serviço) - AxCellOS
 * 
 * Ordens de serviço criadas pelos operadores (lojistas/funcionários).
 * - customerId: referencia customers.id (CPF do cliente final)
 * - operatorCpf: CPF do operador que criou (referência ao AvAdmin users)
 */

import { router, protectedProcedure } from "../lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../db";
import { orders, orderItems, customers } from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { emitToAccount } from "../lib/socket";

function requireTenantContext(ctx: {
  account?: { owner_cpf?: string };
  accountId?: string;
  user?: { cpf?: string };
}) {
  if (!ctx.account?.owner_cpf || !ctx.accountId || !ctx.user?.cpf) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Contexto de autenticação inválido",
    });
  }

  return {
    ownerCpf: ctx.account.owner_cpf,
    accountId: ctx.accountId,
    userCpf: ctx.user.cpf,
  };
}

/** Gera número da OS = ID da ordem (formato yymmddhhmm: 2 dígitos ano, mês, dia, hora, minuto) */
function generateOrderNumberFromDate(now: Date = new Date()) {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${yy}${mm}${dd}${hh}${min}`;
}

export const ordersRouter = router({
  // Lista ordens de serviço
  getOrders: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        customerId: z.string().optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { ownerCpf } = requireTenantContext(ctx);
      const conditions = [eq(orders.ownerCpf, ownerCpf)];

      if (input.status) {
        conditions.push(eq(orders.status, input.status));
      }

      if (input.customerId) {
        conditions.push(eq(orders.customerId, input.customerId));
      }

      if (input.dateFrom) {
        conditions.push(sql`${orders.createdAt} >= ${input.dateFrom}`);
      }

      if (input.dateTo) {
        conditions.push(sql`${orders.createdAt} <= ${input.dateTo}`);
      }

      const orderList = await db
        .select()
        .from(orders)
        .where(and(...conditions))
        .orderBy(desc(orders.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return orderList.map((o) => ({ ...o, orderNumber: o.id }));
    }),

  // Busca ordem por ID (número da OS) com itens
  getOrder: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { ownerCpf } = requireTenantContext(ctx);

      const orderData = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.id, input.id),
            eq(orders.ownerCpf, ownerCpf)
          )
        )
        .limit(1);

      if (orderData.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ordem não encontrada",
        });
      }

      const order = orderData[0];

      // Busca itens da ordem
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, input.id));

      // Busca dados do cliente se existir
      let customer = null;
      if (order.customerId) {
        const customerData = await db
          .select()
          .from(customers)
          .where(eq(customers.id, order.customerId))
          .limit(1);
        customer = customerData[0] || null;
      }

      return {
        ...order,
        orderNumber: order.id,
        items,
        customer,
      };
    }),

  // Cria nova ordem de serviço
  createOrder: protectedProcedure
    .input(
      z.object({
        customerId: z.string().optional(), // CPF do cliente
        items: z.array(
          z.object({
            productId: z.string().uuid(),
            quantity: z.number().min(0.001),
            unitPrice: z.number().min(0),
            discount: z.number().min(0).default(0),
            notes: z.string().optional(),
          })
        ),
        discount: z.number().min(0).default(0),
        /** Total explícito para ordens de serviço (sem itens de produto) */
        totalAmount: z.number().min(0).optional(),
        notes: z.string().optional(),
        deliveryAddress: z.any().optional(),
        paymentMethod: z.string().optional(),
        scheduledFor: z.string().optional(),
        /** Data limite da garantia (ordens de serviço) */
        warrantyUntil: z.string().datetime().optional(),
        /** Senha do aparelho (PIN/pattern do celular) */
        devicePassword: z.string().max(50).optional(),
        /** IDs dos termos de garantia aplicados na OS */
        warrantyTermIds: z.array(z.string().regex(/^[A-Z]{10}$/)).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { ownerCpf, accountId, userCpf } = requireTenantContext(ctx);
      const normalizedCustomerId = input.customerId?.replace(/\D/g, "");

      if (normalizedCustomerId && normalizedCustomerId.length !== 11) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CPF do cliente inválido",
        });
      }

      if (normalizedCustomerId) {
        const existingCustomer = await db
          .select({ id: customers.id })
          .from(customers)
          .where(eq(customers.id, normalizedCustomerId))
          .limit(1);

        if (existingCustomer.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cliente não encontrado para o CPF informado",
          });
        }
      }

      // Gera número da ordem
      const orderNumber = generateOrderNumberFromDate();

      // Calcula totais: usa totalAmount explícito (ordem de serviço) ou soma dos items
      const subtotal = input.items.reduce(
        (sum, item) => sum + (item.unitPrice * item.quantity),
        0
      );
      const totalAmount =
        input.totalAmount !== undefined && input.items.length === 0
          ? input.totalAmount - input.discount
          : subtotal - input.discount;

      // CPF do operador (quem está criando a ordem)
      const operatorCpf = userCpf;

      // Cria ordem (id = número da OS)
      const insertValues: Record<string, unknown> = {
        id: orderNumber,
        orderNumber,
        customerId: normalizedCustomerId,
        operatorCpf,
        accountId,
        ownerCpf,
        totalAmount: totalAmount.toString(),
        discount: input.discount.toString(),
        notes: input.notes,
        deliveryAddress: input.deliveryAddress ? JSON.stringify(input.deliveryAddress) : null,
        paymentMethod: input.paymentMethod,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
      };
      if (input.warrantyUntil) {
        insertValues.warrantyUntil = new Date(input.warrantyUntil);
      }
      if (input.devicePassword) {
        insertValues.devicePassword = input.devicePassword;
      }
      if (input.warrantyTermIds && input.warrantyTermIds.length > 0) {
        insertValues.warrantyTermIds = input.warrantyTermIds;
      }

      const newOrder = await db
        .insert(orders)
        .values(insertValues as typeof orders.$inferInsert)
        .returning();

      const order = newOrder[0];
      emitToAccount(accountId, "orders:updated", { id: order.id, action: "created" });

      // Garante que a API sempre expõe orderNumber = id (ID da OS = id no banco)
      const orderForClient = { ...order, orderNumber: order.id };

      // Cria itens da ordem
      if (input.items.length > 0) {
        const orderItemsData = input.items.map(item => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          discount: item.discount.toString(),
          totalPrice: ((item.unitPrice * item.quantity) - item.discount).toString(),
          notes: item.notes,
        }));

        await db.insert(orderItems).values(orderItemsData);
      }

      return orderForClient;
    }),

  // Atualiza ordem
  updateOrder: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        data: z.object({
          status: z.string().optional(),
          customerId: z.string().optional(),
          discount: z.number().optional(),
          notes: z.string().optional(),
          deliveryAddress: z.any().optional(),
          paymentMethod: z.string().optional(),
          paymentStatus: z.string().optional(),
          scheduledFor: z.string().optional(),
          deliveredAt: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { ownerCpf, accountId } = requireTenantContext(ctx);

      if (input.data.status) {
        const existing = await db.select({ status: orders.status }).from(orders).where(and(eq(orders.id, input.id), eq(orders.ownerCpf, ownerCpf))).limit(1);
        if (existing.length > 0) {
          const cur = existing[0].status;
          const next = input.data.status;
          if (next === "cancelled") {
            if (cur === "delivered") throw new TRPCError({ code: "BAD_REQUEST", message: "Ordem entregue não pode ser cancelada" });
          } else {
            const ORDER = ["draft", "pending", "confirmed", "preparing", "ready", "delivered"];
            const curIdx = ORDER.indexOf(cur);
            const newIdx = ORDER.indexOf(next);
            if (curIdx >= 0 && newIdx >= 0 && newIdx < curIdx) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "Não é permitido voltar o status da ordem" });
            }
          }
        }
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (input.data.status) updateData.status = input.data.status;
      if (input.data.customerId !== undefined) updateData.customerId = input.data.customerId;
      if (input.data.discount !== undefined) updateData.discount = input.data.discount.toString();
      if (input.data.notes !== undefined) updateData.notes = input.data.notes;
      if (input.data.deliveryAddress !== undefined) {
        updateData.deliveryAddress = input.data.deliveryAddress ? JSON.stringify(input.data.deliveryAddress) : null;
      }
      if (input.data.paymentMethod !== undefined) updateData.paymentMethod = input.data.paymentMethod;
      if (input.data.paymentStatus !== undefined) updateData.paymentStatus = input.data.paymentStatus;
      if (input.data.scheduledFor !== undefined) {
        updateData.scheduledFor = input.data.scheduledFor ? new Date(input.data.scheduledFor) : null;
      }
      if (input.data.deliveredAt !== undefined) {
        updateData.deliveredAt = input.data.deliveredAt ? new Date(input.data.deliveredAt) : null;
      }

      const updatedOrder = await db
        .update(orders)
        .set(updateData)
        .where(
          and(
            eq(orders.id, input.id),
            eq(orders.ownerCpf, ownerCpf)
          )
        )
        .returning();

      if (updatedOrder.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ordem não encontrada",
        });
      }

      emitToAccount(accountId, "orders:updated", { id: input.id, action: "updated" });
      return updatedOrder[0];
    }),

  // Confirma pagamento e converte para ENTREGUE
  confirmPayment: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        payment: z.object({
          method: z.string(),
          installments: z.number().default(1),
          feeAmount: z.number().default(0),
          netValue: z.number(),
          feePercent: z.number().optional(),
          date: z.string().datetime().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { ownerCpf, accountId } = requireTenantContext(ctx);

      const existing = await db
        .select({ id: orders.id, notes: orders.notes })
        .from(orders)
        .where(
          and(
            eq(orders.id, input.id),
            eq(orders.ownerCpf, ownerCpf)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ordem não encontrada",
        });
      }

      const paymentInfo = {
        method: input.payment.method,
        installments: input.payment.installments,
        feeAmount: input.payment.feeAmount,
        netValue: input.payment.netValue,
        feePercent: input.payment.feePercent ?? 0,
        date: input.payment.date ? new Date(input.payment.date) : new Date(),
      };

      const paymentJson = `PaymentInfo:${JSON.stringify(paymentInfo)}`;
      const newNotes = [existing[0].notes, paymentJson].filter(Boolean).join(" | ");

      const updated = await db
        .update(orders)
        .set({
          status: "delivered",
          paymentMethod: input.payment.method,
          paymentStatus: "paid",
          notes: newNotes,
          deliveredAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orders.id, input.id),
            eq(orders.ownerCpf, ownerCpf)
          )
        )
        .returning();

      emitToAccount(accountId, "orders:updated", { id: input.id, action: "payment" });
      return updated[0];
    }),

  // Cancela ordem (apenas até status Pronto; Entregue não pode ser cancelada)
  cancelOrder: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { ownerCpf, accountId } = requireTenantContext(ctx);

      const existing = await db
        .select({ status: orders.status })
        .from(orders)
        .where(
          and(
            eq(orders.id, input.id),
            eq(orders.ownerCpf, ownerCpf)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ordem não encontrada",
        });
      }

      if (existing[0].status === "delivered") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ordem já entregue não pode ser cancelada",
        });
      }

      const cancelledOrder = await db
        .update(orders)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orders.id, input.id),
            eq(orders.ownerCpf, ownerCpf)
          )
        )
        .returning();

      emitToAccount(accountId, "orders:updated", { id: input.id, action: "cancelled" });
      return cancelledOrder[0];
    }),

  // Estatísticas de ordens
  getOrderStats: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { ownerCpf } = requireTenantContext(ctx);
      let conditions = [eq(orders.ownerCpf, ownerCpf)];

      if (input.dateFrom) {
        conditions.push(sql`${orders.createdAt} >= ${input.dateFrom}`);
      }

      if (input.dateTo) {
        conditions.push(sql`${orders.createdAt} <= ${input.dateTo}`);
      }

      // Total de ordens
      const totalOrders = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(and(...conditions));

      // Receita total (ordens entregues)
      const totalRevenue = await db
        .select({ sum: sql<string>`sum(${orders.totalAmount})` })
        .from(orders)
        .where(and(...conditions, eq(orders.status, "delivered")));

      // Ordens por status
      const statusStats = await db
        .select({
          status: orders.status,
          count: sql<number>`count(*)`,
        })
        .from(orders)
        .where(and(...conditions))
        .groupBy(orders.status);

      return {
        totalOrders: totalOrders[0]?.count || 0,
        totalRevenue: parseFloat(totalRevenue[0]?.sum || "0"),
        statusBreakdown: statusStats,
      };
    }),
});
