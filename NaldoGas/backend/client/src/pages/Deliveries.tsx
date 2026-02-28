import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, MapPin, Clock, CheckCircle } from "lucide-react";

export default function Deliveries() {
  const [selectedStatus, setSelectedStatus] = useState<"pending" | "in_transit" | "delivered" | "cancelled">("pending");

  const { data: pendingSales } = trpc.deliveries.list.useQuery();
  const updateStatusMutation = trpc.deliveries.updateStatus.useMutation();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs flex items-center gap-1"><Clock size={14} /> Pendente</span>;
      case "in_transit":
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs flex items-center gap-1"><Truck size={14} /> Em Trânsito</span>;
      case "delivered":
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs flex items-center gap-1"><CheckCircle size={14} /> Entregue</span>;
      case "cancelled":
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Cancelado</span>;
      default:
        return <span>{status}</span>;
    }
  };

  const handleStatusChange = async (id: number, newStatus: "pending" | "in_transit" | "delivered" | "cancelled") => {
    try {
      await updateStatusMutation.mutateAsync({
        id,
        status: newStatus,
      });
      toast.success("Status atualizado com sucesso!", { duration: 5000 });
    } catch (error) {
      toast.error("Erro ao atualizar status", { duration: 5000 });
    }
  };

  const filteredDeliveries = pendingSales?.filter(d => d.status === selectedStatus) || [];

  const stats = {
    pending: pendingSales?.filter(d => d.status === "pending").length || 0,
    in_transit: pendingSales?.filter(d => d.status === "in_transit").length || 0,
    delivered: pendingSales?.filter(d => d.status === "delivered").length || 0,
    cancelled: pendingSales?.filter(d => d.status === "cancelled").length || 0,
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold">Gestão de Entregas</h1>

      {/* Resumo de Entregas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="text-sm text-gray-600 mb-1">Pendentes</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </Card>

        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="text-sm text-gray-600 mb-1">Em Trânsito</div>
          <div className="text-2xl font-bold text-blue-600">{stats.in_transit}</div>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="text-sm text-gray-600 mb-1">Entregues</div>
          <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
        </Card>

        <Card className="p-4 bg-red-50 border-red-200">
          <div className="text-sm text-gray-600 mb-1">Canceladas</div>
          <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
        </Card>
      </div>

      {/* Abas de Status */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pendentes ({stats.pending})</TabsTrigger>
          <TabsTrigger value="in_transit">Em Trânsito ({stats.in_transit})</TabsTrigger>
          <TabsTrigger value="delivered">Entregues ({stats.delivered})</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas ({stats.cancelled})</TabsTrigger>
        </TabsList>

        {["pending", "in_transit", "delivered", "cancelled"].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            <Card className="p-4">
              <h2 className="text-xl font-bold mb-4">
                {status === "pending" && "Vendas Pendentes de Entrega"}
                {status === "in_transit" && "Entregas em Trânsito"}
                {status === "delivered" && "Entregas Realizadas"}
                {status === "cancelled" && "Entregas Canceladas"}
              </h2>

              {filteredDeliveries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma entrega neste status
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDeliveries.map((delivery: any) => (
                    <Card key={delivery.id} className="p-4 border-l-4 border-l-blue-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-bold text-lg mb-2">{delivery.customer?.name || "N/A"}</h3>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <MapPin size={16} className="text-blue-600" />
                              <span>{delivery.deliveryAddress}</span>
                            </div>
                            {delivery.notes && (
                              <div className="text-xs">
                                <span className="font-semibold">Observações: </span>
                                {delivery.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col justify-between">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Status</div>
                            {getStatusBadge(delivery.status)}
                          </div>

                          <div className="flex gap-2 mt-4">
                            {status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                                  onClick={() => handleStatusChange(delivery.id, "in_transit")}
                                >
                                  Iniciar Entrega
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => handleStatusChange(delivery.id, "cancelled")}
                                >
                                  Cancelar
                                </Button>
                              </>
                            )}

                            {status === "in_transit" && (
                              <Button
                                size="sm"
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={() => handleStatusChange(delivery.id, "delivered")}
                              >
                                Confirmar Entrega
                              </Button>
                            )}

                            {status === "delivered" && (
                              <div className="text-sm text-green-600 font-semibold">
                                ✓ Entregue com sucesso
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
