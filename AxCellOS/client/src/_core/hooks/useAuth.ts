import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  // Verificar se há token disponível
  const hasToken = useMemo(() => {
    if (typeof window === "undefined") return false;
    const storedToken = localStorage.getItem("avelar_token");
    const hasCookie = document.cookie.includes("avelar_token=");
    return Boolean(storedToken || hasCookie);
  }, []);

  // Query para obter informações do usuário atual
  // Só executa se houver token disponível
  const meQuery = trpc.auth.getCurrentUser.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: typeof window !== "undefined" && hasToken,
  });

  // Logout - limpa dados locais e invalida a query
  const logout = useCallback(async () => {
    try {
      // Limpar dados locais
      localStorage.removeItem("avelar_token");
      localStorage.removeItem("avelar_user");
      
      // Limpar cookie
      document.cookie = "avelar_token=; domain=.avelarcompany.com.br; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      
      // Invalidar cache da query
      utils.auth.getCurrentUser.setData(undefined, undefined);
      await utils.auth.getCurrentUser.invalidate();
    } catch (error) {
      console.error("Erro no logout:", error);
    }
  }, [utils]);

  // Login - redirecionar para App Portal
  const login = useCallback(() => {
    window.location.href = getLoginUrl();
  }, []);

  const state = useMemo(() => {
    const userData = meQuery.data ?? null;

    return {
      user: userData ? {
        id: userData.id,
        name: userData.fullName,
        email: userData.cpf, // Usando CPF como identificador único
        cpf: userData.cpf,
        whatsapp: userData.whatsapp ?? '',
        role: userData.role,
        clientType: userData.clientType,
        enabledModules: userData.enabledModules,
      } : null,
      loading: meQuery.isLoading,
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [meQuery.data, meQuery.error, meQuery.isLoading]);

  // Redirecionar para login se não autenticado
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;

    // Não redirecionar se há um token na URL sendo processado
    const params = new URLSearchParams(window.location.search);
    if (params.has("token") || params.has("auth")) {
      return;
    }

    // Redirecionar para login se não há token
    if (!hasToken) {
      window.location.href = redirectPath;
    }
  }, [redirectOnUnauthenticated, redirectPath, state.loading, state.user, hasToken]);

  return {
    ...state,
    hasToken,
    refresh: () => meQuery.refetch(),
    logout,
    login,
  };
}
