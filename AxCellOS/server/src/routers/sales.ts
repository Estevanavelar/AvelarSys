/**
 * Router de Sales (Vendas do PDV) - AxCellOS
 * 
 * Vendas realizadas no PDV pelos operadores.
 * - customerId: referencia customers.id (CPF do cliente final)
 * - operatorCpf: CPF do operador que fez a venda (referência ao AvAdmin users)
 */

import { router, protectedProcedure } from "../lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../db";
import { sales, saleItems, products, customers } from "../db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export const salesRouter = router({
  getSales: protectedProcedure
    .input(
      z.object({
        customerId: z.string().optional(),
        paymentMethod: z.string().optional(),
        paymentStatus: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(sales.ownerCpf, ctx.account!.owner_cpf!)];

      if (input.paymentStatus) {
        conditions.push(eq(sales.paymentStatus, input.paymentStatus));
      }

      if (input.customerId) {
        conditions.push(eq(sales.customerId, input.customerId));
      }

      if (input.paymentMethod) {
        conditions.push(eq(sales.paymentMethod, input.paymentMethod));
      }

      if (input.dateFrom) {
        conditions.push(sql`${sales.createdAt} >= ${input.dateFrom}`);
      }

      if (input.dateTo) {
        conditions.push(sql`${sales.createdAt} < (${input.dateTo}::date + interval '1 day')`);
      }

      const salesList = await db
        .select()
        .from(sales)
        .where(and(...conditions))
        .orderBy(desc(sales.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return salesList;
    }),

  getSale: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const saleData = await db
        .select()
        .from(sales)
        .where(
          and(
            eq(sales.id, input.id),
            eq(sales.ownerCpf, ctx.account!.owner_cpf!)
          )
        )
        .limit(1);

      if (saleData.length === 0) {
        throw new Error("Venda não encontrada");
      }

      const sale = saleData[0];

      const items = await db
        .select({
          id: saleItems.id,
          productId: saleItems.productId,
          quantity: saleItems.quantity,
          unitPrice: saleItems.unitPrice,
          discount: saleItems.discount,
          totalPrice: saleItems.totalPrice,
          notes: saleItems.notes,
          productName: products.name,
          productSku: products.sku,
        })
        .from(saleItems)
        .leftJoin(products, eq(saleItems.productId, products.id))
        .where(eq(saleItems.saleId, input.id));

      let customer = null;
      if (sale.customerId) {
        const customerData = await db
          .select()
          .from(customers)
          .where(eq(customers.id, sale.customerId))
          .limit(1);
        customer = customerData[0] || null;
      }

      return {
        ...sale,
        items,
        customer,
      };
    }),

  createSale: protectedProcedure
    .input(
      z.object({
        customerId: z.string().optional(),
        orderId: z.string().optional(),
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
        paymentMethod: z.enum(["cash", "credit", "debit", "pix"]),
        paymentStatus: z.string().default("paid"),
        installments: z.number().min(1).max(12).optional(),
        feeAmount: z.number().min(0).optional(),
        feePercent: z.number().min(0).optional(),
        netValue: z.number().min(0).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const subtotal = input.items.reduce(
        (sum, item) => sum + (item.unitPrice * item.quantity),
        0
      );
      const totalAmount = subtotal - input.discount;

      const operatorCpf = ctx.user!.cpf;
      const ownerCpf = ctx.account!.owner_cpf!;
      const accountId = ctx.accountId!;

      if (input.items.length > 0) {
        const productIds = [...new Set(input.items.map((i) => i.productId))];
        const productRows = await db
          .select({ id: products.id, name: products.name, stock: products.stock })
          .from(products)
          .where(
            and(
              eq(products.ownerCpf, ownerCpf),
              inArray(products.id, productIds)
            )
          );

        const productMap = new Map(productRows.map((p) => [p.id, p]));

        for (const item of input.items) {
          const product = productMap.get(item.productId);
          if (!product) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Produto não encontrado: ${item.productId}`,
            });
          }
          const currentStock = Number(product.stock ?? 0);
          if (currentStock < item.quantity) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Estoque insuficiente para "${product.name}". Disponível: ${currentStock}, solicitado: ${item.quantity}`,
            });
          }
        }
      }

      const sale = await db.transaction(async (tx) => {
        const saleItemsSnapshot = input.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          totalPrice: item.unitPrice * item.quantity - item.discount,
          notes: item.notes ?? null,
        }));

        const newSale = await tx
          .insert(sales)
          .values({
            customerId: input.customerId,
            orderId: input.orderId,
            operatorCpf,
            accountId,
            ownerCpf,
            totalAmount: totalAmount.toString(),
            discount: input.discount.toString(),
            paymentMethod: input.paymentMethod,
            paymentStatus: input.paymentStatus,
            installments: input.installments ?? 1,
            feeAmount: (input.feeAmount ?? 0).toString(),
            feePercent: (input.feePercent ?? 0).toString(),
            netValue: input.netValue != null ? input.netValue.toString() : null,
            items: saleItemsSnapshot,
            notes: input.notes,
          })
          .returning();

        const createdSale = newSale[0];

        if (input.items.length > 0) {
          const saleItemsData = input.items.map((item) => ({
            saleId: createdSale.id,
            productId: item.productId,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            discount: item.discount.toString(),
            totalPrice: (
              item.unitPrice * item.quantity -
              item.discount
            ).toString(),
            notes: item.notes,
          }));

          await tx.insert(saleItems).values(saleItemsData);

          for (const item of input.items) {
            await tx
              .update(products)
              .set({
                stock: sql`${products.stock} - ${item.quantity}`,
                updatedAt: new Date(),
              })
              .where(eq(products.id, item.productId));
          }
        }

        return createdSale;
      });

      return sale;
    }),

  updateSale: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: z.object({
          paymentStatus: z.string().optional(),
          notes: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.data.paymentStatus) updateData.paymentStatus = input.data.paymentStatus;
      if (input.data.notes !== undefined) updateData.notes = input.data.notes;

      const updatedSale = await db
        .update(sales)
        .set(updateData)
        .where(
          and(
            eq(sales.id, input.id),
            eq(sales.ownerCpf, ctx.account!.owner_cpf!)
          )
        )
        .returning();

      if (updatedSale.length === 0) {
        throw new Error("Venda não encontrada");
      }

      return updatedSale[0];
    }),

  cancelSale: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const saleData = await db
        .select()
        .from(sales)
        .where(
          and(
            eq(sales.id, input.id),
            eq(sales.ownerCpf, ctx.account!.owner_cpf!)
          )
        )
        .limit(1);

      if (saleData.length === 0) {
        throw new Error("Venda não encontrada");
      }

      const sale = saleData[0];

      if (sale.paymentStatus === "refunded") {
        throw new Error("Venda já está cancelada");
      }

      const items = await db
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, input.id));

      for (const item of items) {
        await db
          .update(products)
          .set({
            stock: sql`${products.stock} + ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.productId));
      }

      const cancelledSale = await db
        .update(sales)
        .set({
          paymentStatus: "refunded",
          updatedAt: new Date(),
        })
        .where(eq(sales.id, input.id))
        .returning();

      return cancelledSale[0];
    }),

  getSalesByPeriod: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string(),
        dateTo: z.string(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
      })
    )
    .query(async ({ ctx, input }) => {
      let dateFormat: string;
      
      switch (input.groupBy) {
        case "day":
          dateFormat = "YYYY-MM-DD";
          break;
        case "week":
          dateFormat = "IYYY-IW";
          break;
        case "month":
          dateFormat = "YYYY-MM";
          break;
      }

      const result = await db
        .select({
          period: sql<string>`to_char(${sales.createdAt}, ${dateFormat})`,
          totalSales: sql<number>`count(*)`,
          totalAmount: sql<string>`sum(${sales.totalAmount})`,
          totalDiscount: sql<string>`sum(${sales.discount})`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.ownerCpf, ctx.account!.owner_cpf!),
            eq(sales.paymentStatus, "paid"),
            sql`${sales.createdAt} >= ${input.dateFrom}`,
            sql`${sales.createdAt} < (${input.dateTo}::date + interval '1 day')`
          )
        )
        .groupBy(sql`to_char(${sales.createdAt}, ${dateFormat})`)
        .orderBy(sql`to_char(${sales.createdAt}, ${dateFormat})`);

      return result.map(r => ({
        ...r,
        totalAmount: parseFloat(r.totalAmount || "0"),
        totalDiscount: parseFloat(r.totalDiscount || "0"),
      }));
    }),

  getPaymentMethodStats: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(sales.ownerCpf, ctx.account!.owner_cpf!),
        eq(sales.paymentStatus, "paid"),
      ];

      if (input.dateFrom) {
        conditions.push(sql`${sales.createdAt} >= ${input.dateFrom}`);
      }

      if (input.dateTo) {
        conditions.push(sql`${sales.createdAt} < (${input.dateTo}::date + interval '1 day')`);
      }

      const result = await db
        .select({
          paymentMethod: sales.paymentMethod,
          count: sql<number>`count(*)`,
          totalAmount: sql<string>`sum(${sales.totalAmount})`,
        })
        .from(sales)
        .where(and(...conditions))
        .groupBy(sales.paymentMethod);

      return result.map(r => ({
        paymentMethod: r.paymentMethod,
        count: r.count,
        totalAmount: parseFloat(r.totalAmount || "0"),
      }));
    }),
});
