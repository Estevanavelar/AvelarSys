/**
 * Router de Reports (Relatórios) - AxCellOS
 * 
 * Relatórios e estatísticas do sistema.
 * Agrega dados de vendas, ordens e produtos.
 */

import { router, protectedProcedure } from "../lib/trpc";
import { z } from "zod";
import { db } from "../db";
import { sales, orders, products, saleItems, orderItems, customers } from "../db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export const reportsRouter = router({
  getDashboard: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const salesConditions = [
        eq(sales.ownerCpf, ctx.account!.owner_cpf!),
        eq(sales.paymentStatus, "paid"),
      ];

      const ordersConditions = [
        eq(orders.ownerCpf, ctx.account!.owner_cpf!),
        eq(orders.status, "delivered"),
      ];

      if (input.dateFrom) {
        salesConditions.push(sql`${sales.createdAt} >= ${input.dateFrom}`);
        ordersConditions.push(sql`${orders.createdAt} >= ${input.dateFrom}`);
      }

      if (input.dateTo) {
        salesConditions.push(sql`${sales.createdAt} < (${input.dateTo}::date + interval '1 day')`);
        ordersConditions.push(sql`${orders.createdAt} < (${input.dateTo}::date + interval '1 day')`);
      }

      const salesStats = await db
        .select({
          count: sql<number>`count(*)`,
          total: sql<string>`coalesce(sum(${sales.totalAmount}), '0')`,
        })
        .from(sales)
        .where(and(...salesConditions));

      const ordersStats = await db
        .select({
          count: sql<number>`count(*)`,
          total: sql<string>`coalesce(sum(${orders.totalAmount}), '0')`,
        })
        .from(orders)
        .where(and(...ordersConditions));

      const totalSales = salesStats[0]?.count || 0;
      const totalSalesAmount = parseFloat(salesStats[0]?.total || "0");
      const totalOrders = ordersStats[0]?.count || 0;
      const totalOrdersAmount = parseFloat(ordersStats[0]?.total || "0");

      const customersCount = await db
        .select({ count: sql<number>`count(distinct ${sales.customerId})` })
        .from(sales)
        .where(and(eq(sales.ownerCpf, ctx.account!.owner_cpf!), sql`${sales.customerId} is not null`));

      const productsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(eq(products.accountId, ctx.accountId!));

      const lowStockProducts = await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(
          and(
            eq(products.accountId, ctx.accountId!),
            sql`${products.stock} <= ${products.minStock}`
          )
        );

      return {
        totalSales,
        totalSalesAmount,
        totalOrders,
        totalOrdersAmount,
        totalRevenue: totalSalesAmount + totalOrdersAmount,
        totalCustomers: customersCount[0]?.count || 0,
        totalProducts: productsCount[0]?.count || 0,
        lowStockProducts: lowStockProducts[0]?.count || 0,
      };
    }),

  getSalesReport: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string(),
        dateTo: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(sales.ownerCpf, ctx.account!.owner_cpf!),
        eq(sales.paymentStatus, "paid"),
        sql`${sales.createdAt} >= ${input.dateFrom}`,
        sql`${sales.createdAt} < (${input.dateTo}::date + interval '1 day')`,
      ];

      const salesData = await db
        .select()
        .from(sales)
        .where(and(...conditions))
        .orderBy(desc(sales.createdAt));

      const paymentMethods = await db
        .select({
          method: sales.paymentMethod,
          count: sql<number>`count(*)`,
          total: sql<string>`sum(${sales.totalAmount})`,
        })
        .from(sales)
        .where(and(...conditions))
        .groupBy(sales.paymentMethod);

      const totalGross = salesData.reduce((sum, s) => sum + parseFloat(s.totalAmount || "0"), 0);
      const totalDiscount = salesData.reduce((sum, s) => sum + parseFloat(s.discount || "0"), 0);

      return {
        sales: salesData,
        totalSales: salesData.length,
        totalGross,
        totalDiscount,
        totalNet: totalGross - totalDiscount,
        paymentMethods: paymentMethods.map(p => ({
          method: p.method,
          count: p.count,
          total: parseFloat(p.total || "0"),
        })),
        avgTicket: salesData.length > 0 ? totalGross / salesData.length : 0,
      };
    }),

  getOrdersReport: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string(),
        dateTo: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(orders.ownerCpf, ctx.account!.owner_cpf!),
        sql`${orders.createdAt} >= ${input.dateFrom}`,
        sql`${orders.createdAt} < (${input.dateTo}::date + interval '1 day')`,
      ];

      const ordersData = await db
        .select()
        .from(orders)
        .where(and(...conditions))
        .orderBy(desc(orders.createdAt));

      const statusBreakdown = await db
        .select({
          status: orders.status,
          count: sql<number>`count(*)`,
          total: sql<string>`sum(${orders.totalAmount})`,
        })
        .from(orders)
        .where(and(...conditions))
        .groupBy(orders.status);

      const totalOrders = ordersData.length;
      const completedOrders = ordersData.filter(o => o.status === "delivered").length;
      const cancelledOrders = ordersData.filter(o => o.status === "cancelled").length;
      const pendingOrders = ordersData.filter(o => 
        ["draft", "pending", "confirmed", "in_progress", "ready"].includes(o.status || "")
      ).length;

      return {
        orders: ordersData,
        totalOrders,
        completedOrders,
        cancelledOrders,
        pendingOrders,
        statusBreakdown: statusBreakdown.map(s => ({
          status: s.status,
          count: s.count,
          total: parseFloat(s.total || "0"),
        })),
      };
    }),

  getProductsReport: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const salesConditions = [
        eq(sales.ownerCpf, ctx.account!.owner_cpf!),
        eq(sales.paymentStatus, "paid"),
      ];

      if (input.dateFrom) {
        salesConditions.push(sql`${sales.createdAt} >= ${input.dateFrom}`);
      }

      if (input.dateTo) {
        salesConditions.push(sql`${sales.createdAt} < (${input.dateTo}::date + interval '1 day')`);
      }

      const topProducts = await db
        .select({
          productId: saleItems.productId,
          productName: products.name,
          productSku: products.sku,
          totalQuantity: sql<string>`sum(${saleItems.quantity})`,
          totalSales: sql<number>`count(distinct ${saleItems.saleId})`,
          totalRevenue: sql<string>`sum(${saleItems.totalPrice})`,
        })
        .from(saleItems)
        .leftJoin(products, eq(saleItems.productId, products.id))
        .leftJoin(sales, eq(saleItems.saleId, sales.id))
        .where(and(...salesConditions))
        .groupBy(saleItems.productId, products.name, products.sku)
        .orderBy(desc(sql`sum(${saleItems.totalPrice})`))
        .limit(input.limit);

      const lowStock = await db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          stock: products.stock,
          minStock: products.minStock,
        })
        .from(products)
        .where(
          and(
            eq(products.accountId, ctx.accountId!),
            eq(products.isActive, true),
            sql`${products.stock} <= ${products.minStock}`
          )
        )
        .limit(input.limit);

      return {
        topProducts: topProducts.map(p => ({
          ...p,
          totalQuantity: parseFloat(p.totalQuantity || "0"),
          totalRevenue: parseFloat(p.totalRevenue || "0"),
        })),
        lowStock,
      };
    }),

  getRecentActivity: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const recentSales = await db
        .select({
          id: sales.id,
          type: sql<string>`'sale'`,
          date: sales.createdAt,
          amount: sales.totalAmount,
          status: sales.paymentStatus,
          paymentMethod: sales.paymentMethod,
        })
        .from(sales)
        .where(eq(sales.ownerCpf, ctx.account!.owner_cpf!))
        .orderBy(desc(sales.createdAt))
        .limit(input.limit);

      const recentOrders = await db
        .select({
          id: orders.id,
          type: sql<string>`'order'`,
          date: orders.createdAt,
          amount: orders.totalAmount,
          status: orders.status,
          orderNumber: orders.id,
        })
        .from(orders)
        .where(eq(orders.ownerCpf, ctx.account!.owner_cpf!))
        .orderBy(desc(orders.createdAt))
        .limit(input.limit);

      const allActivity = [...recentSales, ...recentOrders]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, input.limit);

      return allActivity.map(a => ({
        ...a,
        amount: parseFloat(a.amount || "0"),
      }));
    }),
});
