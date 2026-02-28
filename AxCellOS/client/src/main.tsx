import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import { OrdersProvider } from "@/contexts/OrdersContext";
import { ProductsProvider } from "@/contexts/ProductsContext";
import { CustomersProvider } from "@/contexts/CustomersContext";
import { SocketProvider } from "@/contexts/SocketProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";

const queryClient = new QueryClient();

// Sincronizar token da URL (igual StockTech)
function syncTokenFromQuery() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);

  const authParam = params.get("auth");
  let token = params.get("token");
  let userJson: string | null = null;

  if (authParam) {
    try {
      const decodedAuth = decodeURIComponent(authParam);
      const authParams = new URLSearchParams(decodedAuth);
      token = authParams.get("token") || token;
      const userBase64 = authParams.get("user");
      if (userBase64) {
        userJson = atob(userBase64);
      }
    } catch {
      // ignore malformed auth param
    }
  }

  if (!token) {
    // Se não houver token na URL, verificar se já temos no localStorage ou cookie
    const existingToken = getCookieValue("avelar_token") || localStorage.getItem("avelar_token");
    if (existingToken) {
      console.log('[Auth] Token existente encontrado');
    }
    return;
  }

  console.log('[Auth] Novo token encontrado na URL, processando...');

  // Salvar o token localmente e no cookie para autenticação via header
  localStorage.setItem("avelar_token", token);
  if (userJson) {
    localStorage.setItem("avelar_user", userJson);
  }
  
  // Definir cookie para persistência e compatibilidade
  document.cookie = `avelar_token=${token}; domain=.avelarcompany.com.br; path=/; secure; samesite=none; max-age=31536000`; // 1 ano

  // Limpar a URL após salvar o token
  params.delete("auth");
  params.delete("token");
  params.delete("user");
  const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", cleanUrl);
}

syncTokenFromQuery();

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const cookie = `; ${document.cookie}`;
  const parts = cookie.split(`; ${name}=`);
  if (parts.length < 2) return null;
  const value = parts.pop()?.split(";").shift();
  return value ? decodeURIComponent(value) : null;
}

// URL do backend - detecta automaticamente baseado no ambiente
const getBackendUrl = () => {
  // Se tiver variável de ambiente, usa ela
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Em produção (HTTPS), usa o mesmo domínio
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return window.location.origin;
  }
  
  // Desenvolvimento local
  return "http://localhost:8004";
};

const BACKEND_URL = getBackendUrl();

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${BACKEND_URL}/trpc`,
      transformer: superjson,
      // Força todas as requisições (queries e mutations) a usar POST
      // Isso evita problemas com URLs longas no GET e funciona melhor com proxies
      methodOverride: "POST",
      fetch(input, init) {
        // Obter token do cookie ou localStorage
        const cookieToken = getCookieValue("avelar_token");
        const storageToken = localStorage.getItem("avelar_token");
        const token = cookieToken || storageToken;
        
        // Debug: log token status
        if (!token) {
          console.warn('[tRPC] Nenhum token encontrado! Cookie:', !!cookieToken, 'Storage:', !!storageToken);
        }
        
        const headers = new Headers(init?.headers);
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        return globalThis.fetch(input, {
          ...(init ?? {}),
          headers,
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <SocketProvider>
          <OrdersProvider>
            <ProductsProvider>
              <CustomersProvider>
                <App />
              </CustomersProvider>
            </ProductsProvider>
          </OrdersProvider>
        </SocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
