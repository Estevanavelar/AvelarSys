import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";

import PDV from "@/pages/PDV";
import Inventory from "@/pages/Inventory";
import Customers from "@/pages/Customers";
import Financial from "@/pages/Financial";
import Deliveries from "@/pages/Deliveries";
import Reports from "@/pages/Reports";
import Employees from "@/pages/Employees";
import Containers from "@/pages/Containers";
import EstoqueVasilhames from "@/pages/EstoqueVasilhames";
import CashRegister from "@/pages/CashRegister";
import CustomerContainers from "@/pages/CustomerContainers";
import CatalogManagement from "@/pages/CatalogManagement";
import Dashboard from "@/pages/Dashboard";
import WhatsAppConfig from "./pages/WhatsAppConfig";
import NotificationHistory from "./pages/NotificationHistory";
import DeliveryTracking from "@/pages/DeliveryTracking";
import PublicCatalog from "@/pages/PublicCatalog";
import Orders from "@/pages/Orders";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Sidebar from "./components/Sidebar";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 w-full">
        <Switch>
          <Route path={"/"} component={Dashboard} />

          <Route path={"/pdv"} component={PDV} />
          <Route path={"/caixa"} component={CashRegister} />
          <Route path={"/estoque"} component={EstoqueVasilhames} />
          <Route path={"/vasilhames-clientes"} component={CustomerContainers} />
          <Route path={"/inventory"} component={Inventory} />
          <Route path={"/containers"} component={Containers} />
          <Route path={"/customers"} component={Customers} />
          <Route path={"/financial"} component={Financial} />
          <Route path={"/deliveries"} component={Deliveries} />
          <Route path={"/reports"} component={Reports} />
          <Route path={"/employees"} component={Employees} />
          <Route path="/whatsapp" component={WhatsAppConfig} />
          <Route path="/notifications" component={NotificationHistory} />
          <Route path="/tracking" component={DeliveryTracking} />
          <Route path="/catalog" component={PublicCatalog} />
          <Route path="/pedidos" component={Orders} />
          <Route path="/catalog-management" component={CatalogManagement} />
          <Route path={"/404"} component={NotFound} />
          {/* Final fallback route */}
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
