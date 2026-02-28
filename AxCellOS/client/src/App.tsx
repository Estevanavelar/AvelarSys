import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./_core/hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Settings from "./pages/Settings";
import PDV from "./pages/PDV";
import SalesReport from "./pages/SalesReport";
import OrdersReport from "./pages/OrdersReport";

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

function App() {
  // Hook de autenticação sem bloqueio (igual StockTech)
  useAuth({ redirectOnUnauthenticated: false });

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
