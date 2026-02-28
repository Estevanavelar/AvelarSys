import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as dbHelpers from "../db-helpers";

export const dashboardRouter = router({
  getStats: protectedProcedure.query(async () => {
    const [
      todaySalesCount,
      todayRevenue,
      pendingDeliveriesCount,
      lowStockProducts,
      customersWithPendingContainers,
    ] = await Promise.all([
      dbHelpers.getTodaySalesCount(),
      dbHelpers.getTodayRevenue(),
      dbHelpers.getPendingDeliveriesCount(),
      dbHelpers.getLowStockProducts(),
      dbHelpers.getCustomersWithPendingContainers(),
    ]);

    return {
      todaySalesCount,
      todayRevenue: parseFloat(todayRevenue),
      pendingDeliveriesCount,
      lowStockProductsCount: lowStockProducts.length,
      customersWithPendingContainersCount: customersWithPendingContainers.length,
      lowStockProducts,
      customersWithPendingContainers,
    };
  }),
});
