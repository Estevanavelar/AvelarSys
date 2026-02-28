import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Phone, MessageCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function CustomerContainers() {
  const { data: customersWithContainers, isLoading } = trpc.dashboard.getStats.useQuery();

  const getDelayStatus = (updatedAt: Date) => {
    const now = new Date();
    const updated = new Date(updatedAt);
    const daysDiff = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff >= 10) {
      return { label: "Muito Atrasado", color: "text-red-600", bgColor: "bg-red-50", days: daysDiff };
    } else if (daysDiff >= 5) {
      return { label: "Atrasado", color: "text-orange-600", bgColor: "bg-orange-50", days: daysDiff };
    } else {
      return { label: "Normal", color: "text-green-600", bgColor: "bg-green-50", days: daysDiff };
    }
  };

  const handleContactCustomer = (customerName: string, phone?: string) => {
    if (phone) {
      const message = `Olá ${customerName}! Notamos que você possui vasilhames pendentes de devolução. Por favor, entre em contato conosco para agendar a devolução. Obrigado!`;
      const whatsappUrl = `https://wa.me/55${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
    } else {
      toast.error("Cliente sem telefone cadastrado");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-center text-gray-500">Carregando...</p>
      </div>
    );
  }

  const customers = customersWithContainers?.customersWithPendingContainers || [];

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Vasilhames em Posse de Clientes</h1>
        <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg font-semibold">
          {customers.length} {customers.length === 1 ? "Cliente" : "Clientes"}
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-200 p-3 rounded-full">
              <Clock size={24} className="text-green-700" />
            </div>
            <div>
              <p className="text-sm text-green-700 font-semibold">Normal (0-4 dias)</p>
              <p className="text-2xl font-bold text-green-800">
                {customers.filter((c: any) => {
                  const mostRecent = c.containers.reduce((latest: any, container: any) => {
                    return !latest || new Date(container.updatedAt) > new Date(latest.updatedAt)
                      ? container
                      : latest;
                  }, null);
                  return mostRecent && getDelayStatus(mostRecent.updatedAt).days < 5;
                }).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="flex items-center gap-3">
            <div className="bg-orange-200 p-3 rounded-full">
              <AlertTriangle size={24} className="text-orange-700" />
            </div>
            <div>
              <p className="text-sm text-orange-700 font-semibold">Atrasado (5-9 dias)</p>
              <p className="text-2xl font-bold text-orange-800">
                {customers.filter((c: any) => {
                  const mostRecent = c.containers.reduce((latest: any, container: any) => {
                    return !latest || new Date(container.updatedAt) > new Date(latest.updatedAt)
                      ? container
                      : latest;
                  }, null);
                  const status = mostRecent ? getDelayStatus(mostRecent.updatedAt) : null;
                  return status && status.days >= 5 && status.days < 10;
                }).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <div className="bg-red-200 p-3 rounded-full">
              <AlertTriangle size={24} className="text-red-700" />
            </div>
            <div>
              <p className="text-sm text-red-700 font-semibold">Muito Atrasado (10+ dias)</p>
              <p className="text-2xl font-bold text-red-800">
                {customers.filter((c: any) => {
                  const mostRecent = c.containers.reduce((latest: any, container: any) => {
                    return !latest || new Date(container.updatedAt) > new Date(latest.updatedAt)
                      ? container
                      : latest;
                  }, null);
                  return mostRecent && getDelayStatus(mostRecent.updatedAt).days >= 10;
                }).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabela de Clientes */}
      <Card className="p-4">
        <h2 className="text-xl font-bold mb-4">Lista de Clientes com Vasilhames Pendentes</h2>

        {customers.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Vasilhames</TableHead>
                  <TableHead>Quantidade Total</TableHead>
                  <TableHead>Última Atualização</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((item: any) => {
                  const mostRecentContainer = item.containers.reduce((latest: any, container: any) => {
                    return !latest || new Date(container.updatedAt) > new Date(latest.updatedAt)
                      ? container
                      : latest;
                  }, null);

                  const delayStatus = mostRecentContainer
                    ? getDelayStatus(mostRecentContainer.updatedAt)
                    : { label: "N/A", color: "text-gray-600", bgColor: "bg-gray-50", days: 0 };

                  return (
                    <TableRow key={item.customer.id} className={delayStatus.bgColor}>
                      <TableCell className="font-semibold">{item.customer.name}</TableCell>
                      <TableCell>{item.customer.phone || "Não informado"}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {item.containers.map((container: any, idx: number) => (
                            <div key={idx}>
                              • {container.productName}: {container.quantity}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-orange-600">{item.totalQuantity}</span>
                      </TableCell>
                      <TableCell>
                        {mostRecentContainer
                          ? new Date(mostRecentContainer.updatedAt).toLocaleDateString("pt-BR")
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${delayStatus.color}`}>
                          {delayStatus.label}
                          {delayStatus.days > 0 && ` (${delayStatus.days}d)`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleContactCustomer(item.customer.name, item.customer.phone)}
                            className="flex items-center gap-1"
                          >
                            <MessageCircle size={16} />
                            WhatsApp
                          </Button>
                          {item.customer.phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`tel:${item.customer.phone}`, "_self")}
                              className="flex items-center gap-1"
                            >
                              <Phone size={16} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">🎉 Nenhum cliente com vasilhames pendentes!</p>
            <p className="text-gray-400 text-sm mt-2">Todos os vasilhames foram devolvidos.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
