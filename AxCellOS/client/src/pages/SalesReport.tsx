import React, { useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ResponsiveLayout from '@/components/ResponsiveLayout';
import { Card } from '@/components/ui/card';
import { TrendingUp, DollarSign, ShoppingCart, Package, AlertCircle, CreditCard, Percent } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function SalesReport() {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('week');
  
  const getDateFrom = () => {
    const now = new Date();
    switch (dateRange) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      case 'year':
        return new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    }
  };

  const dateFrom = getDateFrom();
  const dateTo = new Date().toISOString().split('T')[0];

  const { data: salesReport } = trpc.reports.getSalesReport.useQuery({
    dateFrom,
    dateTo,
  });

  const { data: ordersReport } = trpc.reports.getOrdersReport.useQuery({
    dateFrom,
    dateTo,
  });

  const { data: dashboardData } = trpc.reports.getDashboard.useQuery({
    dateFrom,
    dateTo,
  });

  const totalGross = salesReport?.totalGross || 0;
  const totalNet = salesReport?.totalNet || totalGross;
  const totalFees = totalGross - totalNet;
  const totalCount = (salesReport?.totalSales || 0) + (ordersReport?.completedOrders || 0);

  const paymentMethodsData = useMemo(() => {
    if (!salesReport?.paymentMethods) return [];
    
    return salesReport.paymentMethods.map(p => ({
      name: p.method === 'cash' ? 'Dinheiro' : 
            p.method === 'pix' ? 'PIX' : 
            p.method === 'debit' ? 'Débito' : 
            p.method === 'credit' ? 'Crédito' : 'Indefinido',
      value: p.total,
      color: p.method === 'cash' ? '#10b981' : 
             p.method === 'pix' ? '#8b5cf6' : 
             p.method === 'debit' ? '#f59e0b' : 
             p.method === 'credit' ? '#3b82f6' : '#6b7280'
    }));
  }, [salesReport]);

  const allTransactions = useMemo(() => {
    const transactions: any[] = [];
    
    salesReport?.sales?.forEach((s: any) => {
      transactions.push({
        id: s.id.slice(0, 8).toUpperCase(),
        date: s.createdAt,
        total: parseFloat(s.totalAmount || '0'),
        netValue: parseFloat(s.totalAmount || '0'),
        tax: 0,
        paymentMethod: s.paymentMethod || 'indefinido',
        source: 'Venda',
      });
    });

    ordersReport?.orders?.filter((o: any) => o.status === 'delivered').forEach((o: any) => {
      transactions.push({
        id: o.orderNumber || o.id.slice(0, 8).toUpperCase(),
        date: o.createdAt,
        total: parseFloat(o.totalAmount || '0'),
        netValue: parseFloat(o.totalAmount || '0'),
        tax: 0,
        paymentMethod: o.paymentMethod || 'indefinido',
        source: 'Pedido',
      });
    });

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [salesReport, ordersReport]);

  return (
    <ResponsiveLayout activeTab="dashboard">
      <div className="space-y-5 sm:space-y-6 lg:space-y-8 max-w-7xl w-full pb-4">
        <div className="flex flex-col gap-1 sm:gap-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight">Análise Financeira</h1>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">Controle de faturamento, taxas e rendimentos</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                dateRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {range === 'week' ? 'Semana' : range === 'month' ? 'Mês' : 'Ano'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 border-2 border-border/50 rounded-3xl shadow-sm space-y-4">
            <div className="bg-green-100 w-12 h-12 rounded-2xl flex items-center justify-center text-green-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Faturamento Bruto</p>
              <h3 className="text-2xl font-black text-foreground">R$ {totalGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </Card>

          <Card className="p-6 border-2 border-primary/20 rounded-3xl shadow-md bg-primary/5 space-y-4">
            <div className="bg-primary w-12 h-12 rounded-2xl flex items-center justify-center text-primary-foreground">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-primary/60">Lucro Líquido (Real)</p>
              <h3 className="text-2xl font-black text-primary">R$ {totalNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </Card>

          <Card className="p-6 border-2 border-red-100 rounded-3xl shadow-sm space-y-4">
            <div className="bg-red-100 w-12 h-12 rounded-2xl flex items-center justify-center text-red-600">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Taxas Descontadas</p>
              <h3 className="text-2xl font-black text-red-600">R$ {totalFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </Card>

          <Card className="p-6 border-2 border-blue-100 rounded-3xl shadow-sm space-y-4">
            <div className="bg-blue-100 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Vendas/Serviços</p>
              <h3 className="text-2xl font-black text-foreground">{totalCount}</h3>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-8 border-2 border-border/50 rounded-3xl shadow-sm lg:col-span-1">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Distribuição por Método
            </h2>
            <div className="h-[300px]">
              {paymentMethodsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentMethodsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                  <Package className="w-12 h-12 opacity-20" />
                  <p className="text-sm font-medium">Nenhum dado registrado</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-8 border-2 border-border/50 rounded-3xl shadow-sm lg:col-span-2">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Últimas Movimentações
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border/50">
                    <th className="pb-4 text-xs font-black uppercase tracking-widest text-muted-foreground">ID / Origem</th>
                    <th className="pb-4 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Valor Bruto</th>
                    <th className="pb-4 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Taxas</th>
                    <th className="pb-4 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {allTransactions.slice(0, 10).map((t, i) => (
                    <tr key={i} className="group hover:bg-muted/30 transition-colors">
                      <td className="py-4">
                        <p className="font-bold text-sm text-foreground">{t.id}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{t.source} - {new Date(t.date).toLocaleDateString('pt-BR')}</p>
                      </td>
                      <td className="py-4 text-right font-medium text-sm">R$ {t.total.toFixed(2)}</td>
                      <td className="py-4 text-right font-bold text-xs text-red-500">- R$ {(t.tax || 0).toFixed(2)}</td>
                      <td className="py-4 text-right font-black text-sm text-green-600">R$ {(t.netValue || t.total).toFixed(2)}</td>
                    </tr>
                  ))}
                  {allTransactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-muted-foreground italic">Nenhuma transação encontrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </ResponsiveLayout>
  );
}
