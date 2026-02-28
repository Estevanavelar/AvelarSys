import { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ResponsiveLayout from '@/components/ResponsiveLayout';
import { Card } from '@/components/ui/card';
import { Clock, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function OrdersReport() {
  const ordersQuery = trpc.orders.getOrders.useQuery({ limit: 500, offset: 0 });
  const stats = useMemo(() => {
    const orders = ordersQuery.data || [];
    const totalOrders = orders.length;
    const completedOrders = orders.filter((o: any) => o.status === 'delivered').length;
    const pendingOrders = totalOrders - completedOrders;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      completionRate,
      avgRepairTime: '0',
    };
  }, [ordersQuery.data]);

  const ORDERS_DATA = useMemo(() => {
    const orders = ordersQuery.data || [];
    const data: Array<{ date: string; total: number; completed: number; pending: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const fullDateStr = d.toLocaleDateString('pt-BR');
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const ordersOnDate = orders.filter(
        (o: any) => new Date(o.createdAt).toLocaleDateString('pt-BR') === fullDateStr
      );
      const completed = ordersOnDate.filter((o: any) => o.status === 'delivered').length;
      const total = ordersOnDate.length;
      const pending = total - completed;
      data.push({ date: dateStr, total, completed, pending });
    }
    return data;
  }, [ordersQuery.data]);

  const STATUS_DISTRIBUTION = useMemo(() => {
    const orders = ordersQuery.data || [];
    const statusMap: Record<string, { name: string; color: string }> = {
      draft: { name: 'NA BANCADA', color: '#3b82f6' },
      pending: { name: 'NA BANCADA', color: '#3b82f6' },
      confirmed: { name: 'NA BANCADA', color: '#3b82f6' },
      preparing: { name: 'Em Reparo', color: '#f59e0b' },
      ready: { name: 'Pronto', color: '#10b981' },
      delivered: { name: 'Entregue', color: '#8b5cf6' },
      cancelled: { name: 'Cancelado', color: '#ef4444' },
    };
    const counts: Record<string, number> = {};
    orders.forEach((order: any) => {
      const status = statusMap[order.status]?.name || 'NA BANCADA';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: statusMap[Object.keys(statusMap).find((key) => statusMap[key].name === name) || 'pending']?.color || '#3b82f6',
    }));
  }, [ordersQuery.data]);

  const REPAIR_TIME: any[] = [];
  const DEFECTS: any[] = [];

  return (
    <ResponsiveLayout activeTab="ordens">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">🔧 Relatório de Ordens de Serviço</h1>
          <p className="text-muted-foreground mt-1">Análise de reparos e desempenho</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total de Ordens</p>
              <AlertCircle className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
            <p className="text-xs text-blue-600">Últimos 7 dias</p>
          </Card>

          <Card className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Concluídas</p>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.completedOrders}</p>
            <p className="text-xs text-green-600">{stats.completionRate.toFixed(1)}% de conclusão</p>
          </Card>

          <Card className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.pendingOrders}</p>
            <p className="text-xs text-amber-600">Aguardando conclusão</p>
          </Card>

          <Card className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Tempo Médio</p>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.avgRepairTime} dias</p>
            <p className="text-xs text-purple-600">Tempo de reparo</p>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ordens por Dia */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Ordens por Dia</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ORDERS_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#10b981" name="Concluídas" radius={[8, 8, 0, 0]} />
                <Bar dataKey="pending" fill="#f59e0b" name="Pendentes" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Tendência de Conclusão */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Taxa de Conclusão</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ORDERS_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey={(item) => (item.completed / item.total) * 100}
                  stroke="#10b981"
                  name="Taxa de Conclusão (%)"
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Distribuição de Status */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Distribuição por Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={STATUS_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {STATUS_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Tempo Médio de Reparo por Dispositivo */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Tempo Médio por Dispositivo</h2>
            {REPAIR_TIME.length > 0 ? (
              <div className="space-y-4">
                {REPAIR_TIME.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{item.device}</p>
                      <p className="text-sm font-bold text-blue-600">{item.avgTime} dias</p>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full"
                        style={{ width: `${(item.avgTime / 4.1) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{item.orders} ordens</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados reais suficientes.</p>
            )}
          </Card>
        </div>

        {/* Defeitos Mais Comuns */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Defeitos Mais Comuns</h2>
          <div className="overflow-x-auto">
            {DEFECTS.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Defeito</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Quantidade</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Percentual</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Distribuição</th>
                  </tr>
                </thead>
                <tbody>
                  {DEFECTS.map((row, index) => (
                    <tr key={index} className="border-b border-border hover:bg-muted transition-colors">
                      <td className="py-3 px-4 text-foreground">{row.defect}</td>
                      <td className="text-right py-3 px-4 font-semibold text-foreground">{row.count}</td>
                      <td className="text-right py-3 px-4 text-foreground">{row.percentage}%</td>
                      <td className="py-3 px-4">
                        <div className="w-full bg-muted rounded-full h-2 max-w-xs">
                          <div
                            className="bg-gradient-to-r from-amber-400 to-amber-600 h-2 rounded-full"
                            style={{ width: `${row.percentage}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados reais suficientes.</p>
            )}
          </div>
        </Card>
      </div>
    </ResponsiveLayout>
  );
}
