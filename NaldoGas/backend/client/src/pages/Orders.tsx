import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Truck, CheckCircle, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [delivererFilter, setDelivererFilter] = useState<string>("all");
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    orderId: number;
    orderType: "sale" | "public_order";
    status: "pending" | "in_transit" | "delivered";
  } | null>(null);

  const { data: orders, refetch } = trpc.orders.listPendingDeliveries.useQuery();
  const { data: deliverers } = trpc.deliverers.listActive.useQuery();
  
  const assignDelivererMutation = trpc.orders.assignDeliverer.useMutation({
    onSuccess: () => {
      toast.success("Entregador atribuído com sucesso!");
      refetch();
    },
    onError: () => {
      toast.error("Erro ao atribuir entregador");
    },
  });

  const updateStatusMutation = trpc.orders.updateDeliveryStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      refetch();
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
            <Clock size={14} /> Pendente
          </span>
        );
      case "in_transit":
        return (
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
            <Truck size={14} /> Em Trânsito
          </span>
        );
      case "delivered":
        return (
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
            <CheckCircle size={14} /> Entregue
          </span>
        );
      default:
        return <span className="text-gray-600">{status}</span>;
    }
  };

  const handleAssignDeliverer = (orderId: number, orderType: "sale" | "public_order", delivererId: string) => {
    if (!delivererId || delivererId === "unassigned") {
      toast.error("Selecione um entregador");
      return;
    }

    assignDelivererMutation.mutate({
      orderId,
      orderType,
      delivererId: parseInt(delivererId),
    });
  };

  const handleUpdateStatus = (orderId: number, orderType: "sale" | "public_order", status: "pending" | "in_transit" | "delivered") => {
    setPendingStatusChange({ orderId, orderType, status });
  };

  const confirmUpdateStatus = () => {
    if (!pendingStatusChange) return;
    updateStatusMutation.mutate({
      orderId: pendingStatusChange.orderId,
      orderType: pendingStatusChange.orderType,
      status: pendingStatusChange.status,
    });
    setPendingStatusChange(null);
  };

  // Filtrar pedidos
  const filteredOrders = orders?.filter((order) => {
    const matchesStatus = statusFilter === "all" || order.deliveryStatus === statusFilter;
    const matchesDeliverer = delivererFilter === "all" || 
      (delivererFilter === "unassigned" && !order.delivererId) ||
      order.delivererId?.toString() === delivererFilter;
    return matchesStatus && matchesDeliverer;
  }) || [];

  // Calcular estatísticas
  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter((o) => o.deliveryStatus === "pending").length || 0,
    inTransit: orders?.filter((o) => o.deliveryStatus === "in_transit").length || 0,
    delivered: orders?.filter((o) => o.deliveryStatus === "delivered").length || 0,
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">Gerencie pedidos pendentes de entrega</p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Pedidos</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Package className="text-gray-400" size={32} />
          </div>
        </Card>

        <Card className="p-4 bg-yellow-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
            </div>
            <Clock className="text-yellow-600" size={32} />
          </div>
        </Card>

        <Card className="p-4 bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">Em Trânsito</p>
              <p className="text-2xl font-bold text-blue-800">{stats.inTransit}</p>
            </div>
            <Truck className="text-blue-600" size={32} />
          </div>
        </Card>

        <Card className="p-4 bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Entregues</p>
              <p className="text-2xl font-bold text-green-800">{stats.delivered}</p>
            </div>
            <CheckCircle className="text-green-600" size={32} />
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Filtrar por Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_transit">Em Trânsito</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Filtrar por Entregador</label>
            <Select value={delivererFilter} onValueChange={setDelivererFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Entregadores</SelectItem>
                <SelectItem value="unassigned">Não Atribuído</SelectItem>
                {deliverers?.map((d) => (
                  <SelectItem key={d.id} value={d.id.toString()}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tabela de Pedidos */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Entregador</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhum pedido encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={`${order.type}-${order.id}`}>
                  <TableCell className="font-medium">#{order.id}</TableCell>
                  <TableCell>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {order.type === "sale" ? "PDV" : "Catálogo"}
                    </span>
                  </TableCell>
                  <TableCell>{order.customerName || "N/A"}</TableCell>
                  <TableCell>{order.customerPhone || "N/A"}</TableCell>
                  <TableCell>
                    <span className="text-xs capitalize">{order.salesChannel}</span>
                  </TableCell>
                  <TableCell className="font-semibold">
                    R$ {Number(order.totalAmount || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.deliveryStatus || "pending")}</TableCell>
                  <TableCell>
                    <Select
                      value={order.delivererId?.toString() || "unassigned"}
                      onValueChange={(value) => handleAssignDeliverer(order.id, order.type as "sale" | "public_order", value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Não Atribuído</SelectItem>
                        {deliverers?.map((d) => (
                          <SelectItem key={d.id} value={d.id.toString()}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {order.deliveryStatus !== "in_transit" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(order.id, order.type as "sale" | "public_order", "in_transit")}
                        >
                          <Truck size={14} className="mr-1" />
                          Em Rota
                        </Button>
                      )}
                      {order.deliveryStatus !== "delivered" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-green-50 hover:bg-green-100"
                          onClick={() => handleUpdateStatus(order.id, order.type as "sale" | "public_order", "delivered")}
                        >
                          <CheckCircle size={14} className="mr-1" />
                          Entregar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      <AlertDialog open={!!pendingStatusChange} onOpenChange={(open) => !open && setPendingStatusChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar status do pedido</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja alterar o status para{" "}
              {pendingStatusChange?.status === "pending"
                ? "Pendente"
                : pendingStatusChange?.status === "in_transit"
                  ? "Em Trânsito"
                  : "Entregue"}
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUpdateStatus}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
