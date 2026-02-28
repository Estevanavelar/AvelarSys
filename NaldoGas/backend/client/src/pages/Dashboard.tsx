import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertTriangle, TrendingUp, DollarSign, Package, Users, Truck, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: dashboardStats, isLoading } = trpc.dashboard.getStats.useQuery();

  // Dados mockados de vendas do dia (manter por enquanto)
  const todaySales = [
    { time: "08:00", sales: 2, revenue: 500 },
    { time: "09:00", sales: 3, revenue: 750 },
    { time: "10:00", sales: 5, revenue: 1200 },
    { time: "11:00", sales: 4, revenue: 950 },
    { time: "12:00", sales: 6, revenue: 1500 },
    { time: "13:00", sales: 3, revenue: 800 },
    { time: "14:00", sales: 4, revenue: 1000 },
  ];

  // Dados mockados de produtos mais vendidos (manter por enquanto)
  const topProducts = [
    { name: "GLP 13Kg", sales: 18, percentage: 45 },
    { name: "Água 20L", sales: 14, percentage: 35 },
    { name: "Acessórios", sales: 8, percentage: 20 },
  ];

  // KPIs principais - DADOS REAIS DO BANCO
  const kpis = {
    todaySales: dashboardStats?.todaySalesCount || 0,
    todayRevenue: dashboardStats?.todayRevenue || 0,
    averageTicket: (dashboardStats?.todaySalesCount || 0) > 0 
      ? (dashboardStats?.todayRevenue || 0) / (dashboardStats?.todaySalesCount || 1) 
      : 0,
    pendingDeliveries: dashboardStats?.pendingDeliveriesCount || 0,
    overdueReceivables: 0, // TODO: implementar
    lowStockProducts: dashboardStats?.lowStockProductsCount || 0,
    containersWithCustomers: dashboardStats?.customersWithPendingContainersCount || 0,
    overdueContainers: 0, // TODO: implementar
  };

  // Alertas críticos
  const alerts = [
    {
      id: 1,
      type: "error",
      title: "Devolução de Vasilhame Vencida",
      message: "Maria Santos tem 1 vasilhame com devolução vencida há 5 dias",
      action: "Contatar Cliente",
    },
    {
      id: 2,
      type: "warning",
      title: "Estoque Baixo",
      message: "GLP 13Kg com apenas 3 unidades em estoque",
      action: "Reabastecer",
    },
    {
      id: 3,
      type: "warning",
      title: "Fiado Vencido",
      message: "João Silva tem R$ 500 em fiado vencido",
      action: "Cobrar",
    },
  ];

  // Vendas pendentes
  const pendingSales = [
    {
      id: 1,
      customer: "João Silva",
      amount: 250,
      status: "pending",
      deliveryDate: "2024-12-20",
      deliverer: "Pedro",
    },
    {
      id: 2,
      customer: "Maria Santos",
      amount: 180,
      status: "in_route",
      deliveryDate: "2024-12-20",
      deliverer: "Carlos",
    },
    {
      id: 3,
      customer: "Pedro Oliveira",
      amount: 320,
      status: "pending",
      deliveryDate: "2024-12-21",
      deliverer: "Não atribuído",
    },
  ];

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b"];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs flex items-center gap-1"><Clock size={14} /> Pendente</span>;
      case "in_route":
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs flex items-center gap-1"><Truck size={14} /> Em Rota</span>;
      case "delivered":
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs flex items-center gap-1"><CheckCircle size={14} /> Entregue</span>;
      default:
        return <span>{status}</span>;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertTriangle className="text-red-600" size={20} />;
      case "warning":
        return <AlertCircle className="text-yellow-600" size={20} />;
      default:
        return <AlertCircle className="text-blue-600" size={20} />;
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-1">Bem-vindo, {user?.name || "Usuário"}!</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Hoje</div>
          <div className="text-2xl font-bold text-green-600">{new Date().toLocaleDateString("pt-BR")}</div>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Vendas Hoje</div>
              <div className="text-3xl font-bold text-blue-600">{kpis.todaySales}</div>
              <div className="text-xs text-gray-500 mt-2">+12% vs ontem</div>
            </div>
            <TrendingUp className="text-blue-600" size={24} />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Receita Hoje</div>
              <div className="text-3xl font-bold text-green-600">R$ {kpis.todayRevenue.toLocaleString("pt-BR")}</div>
              <div className="text-xs text-gray-500 mt-2">Ticket médio: R$ {kpis.averageTicket.toFixed(2)}</div>
            </div>
            <DollarSign className="text-green-600" size={24} />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Entregas Pendentes</div>
              <div className="text-3xl font-bold text-yellow-600">{kpis.pendingDeliveries}</div>
              <div className="text-xs text-gray-500 mt-2">2 em rota</div>
            </div>
            <Truck className="text-yellow-600" size={24} />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Alertas Críticos</div>
              <div className="text-3xl font-bold text-red-600">{alerts.length}</div>
              <div className="text-xs text-gray-500 mt-2">Ação necessária</div>
            </div>
            <AlertTriangle className="text-red-600" size={24} />
          </div>
        </Card>
      </div>

      {/* Alertas Críticos */}
      {alerts.length > 0 && (
        <Card className="p-4 space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle size={24} className="text-red-600" />
            Alertas Críticos
          </h2>
          {alerts.map((alert) => (
            <Alert key={alert.id} className={alert.type === "error" ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}>
              <div className="flex items-start justify-between">
                <div className="flex gap-3 flex-1">
                  {getAlertIcon(alert.type)}
                  <div>
                    <h3 className="font-semibold">{alert.title}</h3>
                    <AlertDescription>{alert.message}</AlertDescription>
                  </div>
                </div>
                <Button size="sm" className="ml-2 bg-blue-600 hover:bg-blue-700">
                  {alert.action}
                </Button>
              </div>
            </Alert>
          ))}
        </Card>
      )}

      {/* Gráficos */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales">Vendas do Dia</TabsTrigger>
          <TabsTrigger value="products">Produtos Mais Vendidos</TabsTrigger>
          <TabsTrigger value="pending">Entregas Pendentes</TabsTrigger>
        </TabsList>

        {/* Vendas do Dia */}
        <TabsContent value="sales" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Vendas e Receita por Hora</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={todaySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#3b82f6" name="Quantidade de Vendas" />
                <Bar dataKey="revenue" fill="#10b981" name="Receita (R$)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4 grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Pico de Vendas</div>
              <div className="text-2xl font-bold text-blue-600">12:00</div>
              <div className="text-xs text-gray-500">6 vendas</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Receita Máxima</div>
              <div className="text-2xl font-bold text-green-600">R$ 1.500</div>
              <div className="text-xs text-gray-500">12:00</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Melhor Hora</div>
              <div className="text-2xl font-bold text-purple-600">12:00</div>
              <div className="text-xs text-gray-500">Maior volume</div>
            </div>
          </Card>
        </TabsContent>

        {/* Produtos Mais Vendidos */}
        <TabsContent value="products" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Distribuição de Vendas por Produto</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topProducts}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, sales }) => `${name}: ${sales}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="sales"
                >
                  {topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold mb-3">Ranking de Produtos</h3>
            <div className="space-y-3">
              {topProducts.map((product, idx) => (
                <div key={idx} className="flex items-center justify-between pb-3 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                    <div>
                      <div className="font-semibold">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.percentage}% das vendas</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{product.sales}</div>
                    <div className="text-xs text-gray-500">unidades</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Entregas Pendentes */}
        <TabsContent value="pending" className="space-y-4">
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Entregas Pendentes</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Cliente</th>
                    <th className="text-left py-3 px-4 font-semibold">Valor</th>
                    <th className="text-left py-3 px-4 font-semibold">Data Entrega</th>
                    <th className="text-left py-3 px-4 font-semibold">Entregador</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSales.map((sale) => (
                    <tr key={sale.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-semibold">{sale.customer}</td>
                      <td className="py-3 px-4">R$ {sale.amount.toLocaleString("pt-BR")}</td>
                      <td className="py-3 px-4">{new Date(sale.deliveryDate).toLocaleDateString("pt-BR")}</td>
                      <td className="py-3 px-4">{sale.deliverer}</td>
                      <td className="py-3 px-4">{getStatusBadge(sale.status)}</td>
                      <td className="py-3 px-4">
                        <Button size="sm" variant="outline" className="text-xs">
                          Ver Detalhes
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold mb-3">Resumo de Entregas</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">2</div>
                <div className="text-sm text-gray-600">Pendentes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">2</div>
                <div className="text-sm text-gray-600">Em Rota</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">1</div>
                <div className="text-sm text-gray-600">Entregue</div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resumo Financeiro */}
      <Card className="p-4">
        <h2 className="text-xl font-bold mb-4">Resumo Financeiro</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm text-gray-600 mb-1">Entradas Hoje</div>
            <div className="text-2xl font-bold text-green-600">R$ {kpis.todayRevenue.toLocaleString("pt-BR")}</div>
            <div className="text-xs text-gray-500 mt-2">Dinheiro + Cartão + PIX</div>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-sm text-gray-600 mb-1">Fiados Pendentes</div>
            <div className="text-2xl font-bold text-yellow-600">R$ 2.500</div>
            <div className="text-xs text-gray-500 mt-2">{kpis.overdueReceivables} vencidos</div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-gray-600 mb-1">Contas a Pagar</div>
            <div className="text-2xl font-bold text-blue-600">R$ 1.200</div>
            <div className="text-xs text-gray-500 mt-2">Próximos 7 dias</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
