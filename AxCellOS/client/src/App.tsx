import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./_core/hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";

const loadDashboard = () => import("./pages/Dashboard");
const loadOrders = () => import("./pages/Orders");
const loadSettings = () => import("./pages/Settings");
const loadPDV = () => import("./pages/PDV");
const loadSalesReport = () => import("./pages/SalesReport");
const loadOrdersReport = () => import("./pages/OrdersReport");

const Dashboard = lazy(loadDashboard);
const Orders = lazy(loadOrders);
const Settings = lazy(loadSettings);
const PDV = lazy(loadPDV);
const SalesReport = lazy(loadSalesReport);
const OrdersReport = lazy(loadOrdersReport);

// Criar componentes wrapper FORA do Router para evitar recriação
const ProtectedDashboard = () => <ProtectedRoute component={Dashboard} />;
const ProtectedOrders = () => <ProtectedRoute component={Orders} />;
const ProtectedPDV = () => <ProtectedRoute component={PDV} />;
const ProtectedSalesReport = () => <ProtectedRoute component={SalesReport} />;
const ProtectedOrdersReport = () => <ProtectedRoute component={OrdersReport} />;
const ProtectedSettings = () => <ProtectedRoute component={Settings} />;

function Router() {
  return (
    <Switch>
      <Route path="/" component={ProtectedDashboard} />
      <Route path="/dashboard" component={ProtectedDashboard} />
      <Route path="/ordens" component={ProtectedOrders} />
      <Route path="/pdv" component={ProtectedPDV} />
      <Route path="/relatorio-vendas" component={ProtectedSalesReport} />
      <Route path="/relatorio-ordens" component={ProtectedOrdersReport} />
      <Route path="/configuracoes" component={ProtectedSettings} />
      {/* Final fallback route */}
      <Route component={ProtectedDashboard} />
    </Switch>
  );
}

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Carregando pagina...</p>
      </div>
    </div>
  );
}

function App() {
  // Hook de autenticação sem bloqueio (igual StockTech)
  useAuth({ redirectOnUnauthenticated: false });
  const [location] = useLocation();

  useEffect(() => {
    const preloadByLocation = () => {
      if (location === "/" || location === "/dashboard") {
        void loadPDV();
        void loadOrders();
        return;
      }
      if (location === "/pdv") {
        void loadDashboard();
        void loadOrders();
        return;
      }
      if (location === "/ordens") {
        void loadDashboard();
        void loadPDV();
        return;
      }
      void loadDashboard();
      void loadPDV();
    };

    let timeoutId: number | null = null;
    let idleId: number | null = null;
    const runWhenIdle = () => preloadByLocation();
    const hasIdleCallback = typeof window !== "undefined" && "requestIdleCallback" in window;

    if (hasIdleCallback) {
      idleId = (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(runWhenIdle);
    } else {
      timeoutId = window.setTimeout(runWhenIdle, 500);
    }

    return () => {
      if (idleId !== null && "cancelIdleCallback" in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [location]);

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Suspense fallback={<RouteFallback />}>
          <Router />
        </Suspense>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
