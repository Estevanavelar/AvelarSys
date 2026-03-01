import React, { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import ResponsiveLayout from '@/components/ResponsiveLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ServiceOrderCard from '@/components/ServiceOrderCard';
import CreateOrderDialog from '@/components/CreateOrderDialog';
import OrderDetailsDialog from '@/components/OrderDetailsDialog';
import { useOrders, ServiceOrder } from '@/contexts/OrdersContext';

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'NA BANCADA' | 'Em Reparo' | 'Pronto' | 'Entregue' | 'Cancelado'>('todos');
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const { orders, getOrderById } = useOrders();

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = [
    { id: 'todos', label: 'TODAS', count: orders.length },
    { id: 'NA BANCADA', label: '🛠️ NA BANCADA', count: orders.filter((o) => o.status === 'NA BANCADA').length },
    { id: 'Em Reparo', label: '🔧 EM REPARO', count: orders.filter((o) => o.status === 'Em Reparo').length },
    { id: 'Pronto', label: '📦 PRONTO', count: orders.filter((o) => o.status === 'Pronto').length },
    { id: 'Entregue', label: '✅ ENTREGUE', count: orders.filter((o) => o.status === 'Entregue').length },
    { id: 'Cancelado', label: '❌ CANCELADO', count: orders.filter((o) => o.status === 'Cancelado').length },
  ];

  return (
    <ResponsiveLayout activeTab="ordens">
      <div className="space-y-4 sm:space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Ordens de Serviço</h1>
            <p className="text-muted-foreground mt-1 text-sm">Total: {orders.length} ordens</p>
          </div>
          <Button
            onClick={() => setShowCreateOrder(true)}
            className="gap-2 w-full sm:w-auto bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground rounded-xl sm:rounded-full h-11 sm:h-12 px-5 sm:px-6 font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Ordem</span>
            <span className="sm:hidden">Ordem</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por número da OS ou cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 sm:pl-12 rounded-xl sm:rounded-full h-11 sm:h-12 text-sm sm:text-base"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {statuses.map((status) => (
            <button
              key={status.id}
              onClick={() => setStatusFilter(status.id as any)}
              className={`px-3 sm:px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm sm:text-base transition-all shrink-0 ${
                statusFilter === status.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card border border-border text-foreground hover:border-primary'
              }`}
            >
              {status.label} ({status.count})
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-3 sm:space-y-4">
          {filteredOrders.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredOrders.map((order) => (
                <ServiceOrderCard 
                  key={order.id} 
                  order={order} 
                  onClick={(o) => setSelectedOrder(o)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 text-center">
              <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhuma ordem encontrada</p>
              <p className="text-sm text-muted-foreground mt-2">Tente ajustar seus filtros</p>
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
