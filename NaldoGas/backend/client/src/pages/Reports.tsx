import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, TrendingUp } from "lucide-react";

export default function Reports() {
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  // Dados mockados para demonstração
  const salesByDay = [
    { date: "01/12", sales: 1200, revenue: 3500 },
    { date: "02/12", sales: 1900, revenue: 4200 },
    { date: "03/12", sales: 1500, revenue: 3800 },
    { date: "04/12", sales: 2200, revenue: 5100 },
    { date: "05/12", sales: 2800, revenue: 6200 },
    { date: "06/12", sales: 2100, revenue: 4900 },
    { date: "07/12", sales: 2900, revenue: 6500 },
  ];

  const salesByProduct = [
    { name: "GLP 13Kg", value: 45, revenue: 15000 },
    { name: "Água 20L", value: 30, revenue: 9000 },
    { name: "Acessórios", value: 15, revenue: 3000 },
    { name: "Outros", value: 10, revenue: 2000 },
  ];

  const paymentMethods = [
    { name: "Dinheiro", value: 35, amount: 12000 },
    { name: "Cartão Crédito", value: 40, amount: 14000 },
    { name: "PIX", value: 20, amount: 7000 },
    { name: "Fiado", value: 5, amount: 2000 },
  ];

  const cashFlow = [
    { period: "Semana 1", income: 8500, expenses: 3200, net: 5300 },
    { period: "Semana 2", income: 9200, expenses: 3500, net: 5700 },
    { period: "Semana 3", income: 10100, expenses: 3800, net: 6300 },
    { period: "Semana 4", income: 9800, expenses: 3600, net: 6200 },
  ];

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  const stats = {
    totalSales: 35800,
    totalRevenue: 98000,
    averageTicket: 2734,
    totalOrders: 36,
    receivables: 15000,
    payables: 8500,
    netCashFlow: 23500,
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Relatórios e Análises</h1>
        <Button className="bg-green-600 hover:bg-green-700">
          <Download size={20} className="mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Período</label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Última Semana</SelectItem>
                <SelectItem value="month">Último Mês</SelectItem>
                <SelectItem value="quarter">Último Trimestre</SelectItem>
                <SelectItem value="year">Último Ano</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {period === "custom" && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-2">Data Inicial</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Data Final</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </>
          )}

          <div className="flex items-end">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">Gerar Relatório</Button>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="text-sm text-gray-600 mb-1">Total de Vendas</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalOrders}</div>
          <div className="text-xs text-gray-500 mt-2">Pedidos no período</div>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="text-sm text-gray-600 mb-1">Receita Total</div>
          <div className="text-2xl font-bold text-green-600">R$ {stats.totalRevenue.toLocaleString("pt-BR")}</div>
          <div className="text-xs text-gray-500 mt-2">Ticket médio: R$ {stats.averageTicket.toFixed(2)}</div>
        </Card>

        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="text-sm text-gray-600 mb-1">Contas a Receber</div>
          <div className="text-2xl font-bold text-yellow-600">R$ {stats.receivables.toLocaleString("pt-BR")}</div>
          <div className="text-xs text-gray-500 mt-2">Fiados pendentes</div>
        </Card>

        <Card className="p-4 bg-red-50 border-red-200">
          <div className="text-sm text-gray-600 mb-1">Fluxo de Caixa Líquido</div>
          <div className="text-2xl font-bold text-green-600">R$ {stats.netCashFlow.toLocaleString("pt-BR")}</div>
          <div className="text-xs text-gray-500 mt-2">Entradas - Saídas</div>
        </Card>
      </div>

      {/* Gráficos */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales">Vendas por Dia</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="payment">Pagamentos</TabsTrigger>
          <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
        </TabsList>

        {/* Vendas por Dia */}
        <TabsContent value="sales" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Vendas e Receita por Dia</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#3b82f6" name="Quantidade de Vendas" />
                <Bar dataKey="revenue" fill="#10b981" name="Receita (R$)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold mb-3">Análise de Tendência</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Média de vendas por dia:</span>
                <span className="font-semibold">R$ {(stats.totalRevenue / 7).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dia com maior receita:</span>
                <span className="font-semibold">07/12 - R$ 6.500</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Crescimento estimado:</span>
                <span className="font-semibold text-green-600 flex items-center gap-1">
                  <TrendingUp size={16} /> +15%
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Produtos */}
        <TabsContent value="products" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Vendas por Produto</h2>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={salesByProduct}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {salesByProduct.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold mb-3">Detalhes por Produto</h3>
            <div className="space-y-3">
              {salesByProduct.map((product, idx) => (
                <div key={idx} className="flex justify-between items-center pb-3 border-b last:border-b-0">
                  <span className="font-semibold">{product.name}</span>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">{product.value}% das vendas</div>
                    <div className="font-bold text-green-600">R$ {product.revenue.toLocaleString("pt-BR")}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Formas de Pagamento */}
        <TabsContent value="payment" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Distribuição de Formas de Pagamento</h2>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={paymentMethods}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold mb-3">Resumo de Pagamentos</h3>
            <div className="space-y-3">
              {paymentMethods.map((method, idx) => (
                <div key={idx} className="flex justify-between items-center pb-3 border-b last:border-b-0">
                  <span className="font-semibold">{method.name}</span>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">{method.value}% das transações</div>
                    <div className="font-bold text-blue-600">R$ {method.amount.toLocaleString("pt-BR")}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Fluxo de Caixa */}
        <TabsContent value="cashflow" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Fluxo de Caixa Semanal</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={cashFlow}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10b981" name="Entradas (R$)" strokeWidth={2} />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Saídas (R$)" strokeWidth={2} />
                <Line type="monotone" dataKey="net" stroke="#3b82f6" name="Líquido (R$)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold mb-3">Análise de Fluxo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total de Entradas:</span>
                <span className="font-semibold text-green-600">R$ 37.600</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total de Saídas:</span>
                <span className="font-semibold text-red-600">R$ 14.100</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600 font-semibold">Saldo Líquido:</span>
                <span className="font-bold text-green-600">R$ 23.500</span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
