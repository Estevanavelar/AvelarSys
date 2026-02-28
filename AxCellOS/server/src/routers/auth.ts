import { router, publicProcedure } from "../lib/trpc";
import { z } from "zod";

export const authRouter = router({
  // Get current user info (already validated by auth middleware)
  getCurrentUser: publicProcedure
    .query(({ ctx }) => {
      if (!ctx.user) {
        throw new Error("Usuário não autenticado");
      }

      return {
        id: ctx.user.id,
        fullName: ctx.user.full_name,
        cpf: ctx.user.cpf,
        whatsapp: ctx.user.whatsapp,
        role: ctx.user.role,
        accountId: ctx.user.account_id,
        isActive: ctx.user.is_active,
        whatsappVerified: ctx.user.whatsapp_verified,
        clientType: ctx.user.client_type,
        enabledModules: ctx.user.enabled_modules,
      };
    }),

  // Get account info
  getAccountInfo: publicProcedure
    .query(({ ctx }) => {
      if (!ctx.account) {
        throw new Error("Conta não encontrada");
      }

      return {
        id: ctx.account.id,
        companyName: ctx.account.company_name,
        cnpj: ctx.account.cnpj,
        status: ctx.account.status,
        clientType: ctx.account.client_type,
        enabledModules: ctx.account.enabled_modules,
      };
    }),

  // Check module access
  checkModuleAccess: publicProcedure
    .input(z.object({ moduleName: z.string() }))
    .query(({ ctx, input }) => {
      if (!ctx.user) {
        return false;
      }

      // Check user-specific modules first, then account fallback
      const userModules = ctx.user.enabled_modules || [];
      const accountModules = ctx.account?.enabled_modules || [];

      return userModules.includes(input.moduleName) ||
             accountModules.includes(input.moduleName);
    }),
});