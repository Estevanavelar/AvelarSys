import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, TrendingUp, Package as PackageIcon, 
  AlertTriangle, DollarSign, Calendar, FileText, ArrowRight,
  CheckCircle2, ChevronRight, X as XIcon, PackageCheck
} from 'lucide-react';
import ResponsiveLayout from '@/components/ResponsiveLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge as BadgeIcon } from '@/components/ui/badge';
import ServiceOrderCard from '@/components/ServiceOrderCard';
import CreateOrderDialog from '@/components/CreateOrderDialog';
import OrderDetailsDialog from '@/components/OrderDetailsDialog';
import { useOrders, ServiceOrder } from '@/contexts/OrdersContext';
import { useProducts } from '@/contexts/ProductsContext';
import { useCustomers } from '@/contexts/CustomersContext';
import { trpc } from '@/lib/trpc';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'warranty' | 'ready'>('all');
  
  const { orders, getOrderById } = useOrders();
  const { products } = useProducts();
  const { customers } = useCustomers();
  const { data: pdvSales = [] } = trpc.sales.getSales.useQuery({
    paymentStatus: 'paid',
    limit: 500,
    offset: 0,
  });

  // Dados reais para as métricas
  const metrics = useMemo(() => {
    const today = new Date().toLocaleDateString('pt-BR');
    const thisMonth = new Date().getMonth();

    const deliveredToday = orders.filter(
      (o) =>
        o.status === 'Entregue' &&
        o.createdAt.toLocaleDateString('pt-BR') === today
    );

    const todayOrdersGross = deliveredToday.reduce((acc, o) => acc + (o.totalValue || 0), 0);
    const todayPdvGross = pdvSales
      .filter((s: any) => new Date(s.createdAt).toLocaleDateString('pt-BR') === today)
      .reduce((acc: number, s: any) => acc + Number(s.totalAmount || 0), 0);
    const todayGross = todayOrdersGross + todayPdvGross;
    const todayNet = todayGross;

    const deliveredThisMonth = orders.filter(
      (o) =>
        o.status === 'Entregue' &&
        o.createdAt.getMonth() === thisMonth
    );

    const monthlyOrdersGross = deliveredThisMonth.reduce((acc, o) => acc + (o.totalValue || 0), 0);
    const currentYear = new Date().getFullYear();
    const monthlyPdvGross = pdvSales
      .filter((s: any) => {
        const d = new Date(s.createdAt);
        return d.getMonth() === thisMonth && d.getFullYear() === currentYear;
      })
      .reduce((acc: number, s: any) => acc + Number(s.totalAmount || 0), 0);
    const monthlyGross = monthlyOrdersGross + monthlyPdvGross;

    const totalFees = 0;

    const lowStockCount = products.filter(p => p.quantity <= (p.minStock || 0)).length;

    const readyForDelivery = orders.filter(o => o.status === 'Pronto').length;

    return {
      todayRevenue: todayNet,
      todayNet,
      todayGross,
      totalFees,
      monthlyRevenue: monthlyGross,
      monthlyGross,
      lowStockCount,
      totalOrders: orders.length,
      activeOrders: orders.filter(o => o.status !== 'Entregue' && o.status !== 'Cancelado').length,
      readyForDelivery
    };
  }, [orders, products, customers, pdvSales]);

  // Dados para o gráfico de faturamento (últimos 7 dias) — barras
  const chartData = useMemo(() => {
    const pdvByDay = new Map<string, { totalAmount: number; totalSales: number }>();
    pdvSales.forEach((s: any) => {
      const key = new Date(s.createdAt).toLocaleDateString('pt-BR');
      const current = pdvByDay.get(key) || { totalAmount: 0, totalSales: 0 };
      current.totalAmount += Number(s.totalAmount || 0);
      current.totalSales += 1;
      pdvByDay.set(key, current);
    });

    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const fullDateStr = d.toLocaleDateString('pt-BR');

      const deliveredThatDay = orders.filter(
        (o) => o.status === 'Entregue' && o.createdAt.toLocaleDateString('pt-BR') === fullDateStr
      );
      const ordersValue = deliveredThatDay.reduce((acc, o) => acc + (o.totalValue || 0), 0);
      const pdvValue = pdvByDay.get(fullDateStr)?.totalAmount || 0;
      const faturamento = ordersValue + pdvValue;

      data.push({
        name: dateStr,
        faturamento,
        entregas: deliveredThatDay.length + (pdvByDay.get(fullDateStr)?.totalSales || 0),
      });
    }
    return data;
  }, [orders, pdvSales]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = 
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (filterMode === 'warranty') {
        if (order.status !== 'Entregue' || !order.warrantyUntil) return false;
        const diff = new Date(order.warrantyUntil).getTime() - new Date().getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return matchesSearch && days >= 0 && days <= 7;
      }

      if (filterMode === 'ready') {
        return matchesSearch && order.status === 'Pronto';
      }
      
      return matchesSearch;
    });
  }, [orders, searchQuery, filterMode]);

  return (
    <ResponsiveLayout activeTab="dashboard">
      <div className="space-y-5 sm:space-y-6 lg:space-y-8 w-full">
        
        {/* Header Principal */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight">Painel de Controle</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg">Visão geral da sua assistência técnica</p>
          </div>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              onClick={() => setShowCreateOrder(true)}
              className="gap-2 flex-1 sm:flex-initial bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground rounded-xl sm:rounded-2xl h-12 sm:h-14 px-6 sm:px-8 font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Nova Ordem
            </Button>
          </div>
        </div>

        {/* Grade de Métricas Reais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Faturamento do Dia */}
          <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-10 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-10 h-10 sm:w-16 sm:h-16 text-green-600" />
            </div>
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Faturamento Hoje</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xs sm:text-sm font-bold text-green-600">R$</span>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground truncate">{(metrics.todayRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Mês: R$ {(metrics.monthlyRevenue || 0).toLocaleString('pt-BR')}</span>
            </div>
          </div>

          {/* Estoque Baixo */}
          <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-10 group-hover:scale-110 transition-transform">
              <PackageIcon className="w-10 h-10 sm:w-16 sm:h-16 text-orange-600" />
            </div>
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Estoque Crítico</p>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground">{metrics.lowStockCount}</h3>
            <p className="text-sm font-bold text-orange-600 mt-4 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Produtos com falta
            </p>
          </div>

          {/* Quantidade de Ordens */}
          <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-10 group-hover:scale-110 transition-transform">
              <FileText className="w-10 h-10 sm:w-16 sm:h-16 text-blue-600" />
            </div>
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Quantidade de Ordens</p>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground">{metrics.totalOrders}</h3>
            <p className="text-sm font-bold text-blue-600 mt-4">{metrics.activeOrders} em andamento</p>
          </div>

          {/* Prontos para Entrega */}
          <div
            onClick={() => metrics.readyForDelivery > 0 && setFilterMode(filterMode === 'ready' ? 'all' : 'ready')}
            className={`bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group ${metrics.readyForDelivery > 0 ? 'cursor-pointer' : ''}`}
          >
            <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-10 group-hover:scale-110 transition-transform">
              <PackageCheck className="w-10 h-10 sm:w-16 sm:h-16 text-purple-600" />
            </div>
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Prontos para Entrega</p>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground">{metrics.readyForDelivery}</h3>
            <p className="text-sm font-bold text-purple-600 mt-4 flex items-center gap-1 underline">
              Aparelhos prontos aguardando retirada <ArrowRight className="w-3 h-3" />
            </p>
          </div>
        </div>

        {/* Gráfico e Relatórios */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Desempenho Semanal
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs gap-2">
                  <Calendar className="w-3 h-3" />
                  Últimos 7 dias
                </Button>
              </div>
            </div>
            <div className="h-[260px] sm:h-[300px] lg:h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 16, right: 16, left: 16, bottom: 8 }} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 600 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }}
                    tickFormatter={(v) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`)}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--card))',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: 4 }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Faturamento']}
                    labelFormatter={(label, payload) => payload[0]?.payload ? `${label} • ${(payload[0].payload as { entregas?: number }).entregas ?? 0} entrega(s)` : label}
                  />
                  <Bar
                    dataKey="faturamento"
                    fill="hsl(var(--primary))"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={56}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.faturamento > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ações e Relatórios Rápidos */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm h-full flex flex-col">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Relatórios
              </h2>
              <div className="space-y-3 flex-1">
                <Button variant="outline" className="w-full justify-between h-14 sm:h-16 rounded-xl sm:rounded-2xl border-dashed hover:bg-primary/5 hover:border-primary transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-xl text-green-600 group-hover:scale-110 transition-transform">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm">Relatório do Dia</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-black">Vendas e Ordens Hoje</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Button>

                <Button variant="outline" className="w-full justify-between h-14 sm:h-16 rounded-xl sm:rounded-2xl border-dashed hover:bg-primary/5 hover:border-primary transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm">Relatório Mensal</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-black">Fechamento do Mês</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Button>

                <Button variant="outline" className="w-full justify-between h-14 sm:h-16 rounded-xl sm:rounded-2xl border-dashed hover:bg-primary/5 hover:border-primary transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-xl text-orange-600 group-hover:scale-110 transition-transform">
                      <PackageIcon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm">Inventário</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-black">Produtos e Estoque</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <p className="text-xs font-medium italic">Sistema sincronizado com sucesso.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seção de Ordens Recentes */}
        <div className="space-y-4 sm:space-y-6 pt-2 sm:pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2 sm:gap-3 flex-wrap">
              {filterMode === 'warranty' ? 'Alertas de Garantia' : filterMode === 'ready' ? 'Prontos para Entrega' : 'Ordens de Serviço'}
              {filterMode === 'warranty' && (
                <BadgeIcon onClick={() => setFilterMode('all')} className="bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer border-none px-3 py-1">
                  Filtrado por garantia <XIcon className="w-3 h-3 ml-2" />
                </BadgeIcon>
              )}
              {filterMode === 'ready' && (
                <BadgeIcon onClick={() => setFilterMode('all')} className="bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer border-none px-3 py-1">
                  Prontos <XIcon className="w-3 h-3 ml-2" />
                </BadgeIcon>
              )}
            </h2>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar OS ou cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-2xl h-10 bg-muted/50 border-none focus:bg-background transition-all"
              />
            </div>
          </div>

          {filteredOrders.length > 0 ? (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredOrders.map((order) => (
                <ServiceOrderCard 
                  key={order.id} 
                  order={order} 
                  onClick={(o) => setSelectedOrder(o)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-muted/20 border border-dashed border-border rounded-2xl sm:rounded-[2rem] p-8 sm:p-12 text-center">
              <div className="bg-muted/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">🔍</div>
              <p className="text-muted-foreground font-medium text-lg">Nenhuma ordem encontrada para sua busca.</p>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateOrderDialog open={showCreateOrder} onOpenChange={setShowCreateOrder} />
      <OrderDetailsDialog 
        open={!!selectedOrder} 
        onOpenChange={(open) => !open && setSelectedOrder(null)} 
        order={selectedOrder ? (getOrderById(selectedOrder.id) ?? selectedOrder) : null}
      />
    </ResponsiveLayout>
  );
}
