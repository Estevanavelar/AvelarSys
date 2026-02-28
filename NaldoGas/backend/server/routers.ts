import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { productsRouter } from "./routers/products";
import { customersRouter } from "./routers/customers";
import { salesRouter } from "./routers/sales";
import { financialRouter } from "./routers/financial";
import { deliveriesRouter } from "./routers/deliveries";
import { reportsRouter } from "./routers/reports";
import { whatsappRouter } from "./routers/whatsapp";
import { whatsappConfigRouter } from "./routers/whatsapp-config";
import { whatsappBaileysRouter } from "./routers/whatsapp-baileys";
import { inventoryRouter } from "./routers/inventory";
import { containersRouter } from "./routers/containers";
import { cashRegisterRouter } from "./routers/cashRegister";
import { dashboardRouter } from "./routers/dashboard";
import { publicCatalogRouter } from "./routers/publicCatalog";
import { deliverersRouter } from "./routers/deliverers";
import { ordersRouter } from "./routers/orders";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  products: productsRouter,
  customers: customersRouter,
  sales: salesRouter,
  financial: financialRouter,
  deliveries: deliveriesRouter,
  reports: reportsRouter,
  whatsapp: whatsappRouter,
  whatsappConfig: whatsappConfigRouter,
  whatsappBaileys: whatsappBaileysRouter,
  inventory: inventoryRouter,
  containers: containersRouter,
  cashRegister: cashRegisterRouter,
  dashboard: dashboardRouter,
  publicCatalog: publicCatalogRouter,
  deliverers: deliverersRouter,
  orders: ordersRouter,
});

export type AppRouter = typeof appRouter;
