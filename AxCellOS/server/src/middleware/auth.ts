import { TRPCError } from "@trpc/server";
import { type CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { avadminApi } from "../lib/avadmin-api";
import { type Context } from "../lib/trpc";
import { syncAccountToUsers, ensureUserExists } from "../services/sync";

// Extract token from Authorization header
function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7); // Remove "Bearer " prefix
}

// Extract token from cookies (fallback)
function extractTokenFromCookies(cookies: any): string | null {
  return cookies?.auth_token || cookies?.token || null;
}

// Create context with authentication
export async function createContext({
  req,
  res,
}: CreateExpressContextOptions): Promise<Context> {
  const baseContext: Context = {
    req,
    res,
  };

  // Try to extract token from Authorization header first
  let token = extractTokenFromHeader(req.headers.authorization);

  // If not found in header, try cookies
  if (!token) {
    token = extractTokenFromCookies(req.cookies);
  }

  // If still no token, return context without user
  if (!token) {
    return baseContext;
  }

  try {
    // Validate token with AvAdmin
    const validationResult = await avadminApi.validateToken(token);

    if (!validationResult.valid || !validationResult.user) {
      return baseContext;
    }

    const user = validationResult.user;
    const account = validationResult.account;

    // VALIDACAO: Rejeitar clientes finais no AxCellOS
    if (user.client_type === "cliente_final" || user.client_type === "cliente") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Clientes finais não fazem login no AxCellOS"
      });
    }

    // Set accountId for multi-tenancy (CNPJ)
    const accountId = user.account_id;

    // SINCRONIZAÇÃO: Garante que existe registro em users (evita FK em warranty_terms, settings, etc.)
    if (account) {
      await syncAccountToUsers(account, user.client_type || "unknown");
    } else if (accountId) {
      // Token tem account_id mas API não retornou account — cria registro mínimo para satisfazer FK
      const ownerCpf = (user as { owner_cpf?: string }).owner_cpf || user.cpf || "";
      await ensureUserExists(accountId, ownerCpf);
    }

    return {
      ...baseContext,
      user,
      account: account ? {
        id: account.id,
        company_name: account.company_name,
        cnpj: account.cnpj,
        document: account.document,
        owner_cpf: account.owner_cpf,
        status: account.status,
        client_type: account.enabled_modules?.includes('cliente') ? 'cliente' : undefined,
        enabled_modules: account.enabled_modules,
      } : undefined,
      accountId: accountId ?? undefined,
    };
  } catch (error) {
    console.error("Error during authentication:", error);
    // Return context without user on authentication error
    return baseContext;
  }
}