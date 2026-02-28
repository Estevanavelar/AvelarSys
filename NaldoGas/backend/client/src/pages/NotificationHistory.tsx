import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Filter, RefreshCw } from "lucide-react";

export default function NotificationHistory() {
  const [filter, setFilter] = useState<"all" | "sale" | "delivery" | "reminder" | "stock">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "failed" | "pending">("all");
  const [searchPhone, setSearchPhone] = useState("");

  // Dados mockados para demonstração
  const notifications = [
    {
      id: 1,
      phoneNumber: "+55 (27) 99999-1111",
      message: "Olá! Sua venda de R$ 150,00 foi registrada com sucesso. Produtos: GLP 13Kg (1x), Água 20L (2x)",
      messageType: "sale",
      status: "sent",
      sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    {
      id: 2,
      phoneNumber: "+55 (27) 99999-2222",
      message: "Sua entrega está a caminho! Motorista: João Silva. Acompanhe em tempo real.",
      messageType: "delivery",
      status: "sent",
      sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 30 * 60 * 1000),
    },
    {
      id: 3,
      phoneNumber: "+55 (27) 99999-3333",
      message: "Lembrete: Você tem R$ 500,00 em aberto. Vencimento: 25/12/2025",
      messageType: "reminder",
      status: "sent",
      sentAt: new Date(Date.now() - 30 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 15 * 60 * 1000),
    },
    {
      id: 4,
      phoneNumber: "+55 (27) 99999-4444",
      message: "Alerta: Estoque de GLP 13Kg está baixo (5 unidades). Recomendamos reposição.",
      messageType: "stock",
      status: "sent",
      sentAt: new Date(Date.now() - 10 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 5 * 60 * 1000),
    },
    {
      id: 5,
      phoneNumber: "+55 (27) 99999-5555",
      message: "Erro ao enviar mensagem. Tente novamente mais tarde.",
      messageType: "sale",
      status: "failed",
      sentAt: new Date(Date.now() - 5 * 60 * 1000),
      deliveredAt: null,
    },
  ];

  const getMessageTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sale: "Venda",
      delivery: "Entrega",
      reminder: "Lembrete",
      stock: "Estoque",
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      sent: "bg-green-100 text-green-800",
      delivered: "bg-blue-100 text-blue-800",
      failed: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getMessageTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      sale: "bg-blue-100 text-blue-800",
      delivery: "bg-purple-100 text-purple-800",
      reminder: "bg-orange-100 text-orange-800",
      stock: "bg-red-100 text-red-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const filteredNotifications = notifications.filter((notif) => {
    const matchesType = filter === "all" || notif.messageType === filter;
    const matchesStatus = statusFilter === "all" || notif.status === statusFilter;
    const matchesPhone = searchPhone === "" || notif.phoneNumber.includes(searchPhone);
    return matchesType && matchesStatus && matchesPhone;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Histórico de Notificações</h1>
        <p className="text-gray-600 mt-2">Acompanhe todas as mensagens WhatsApp enviadas pelo sistema</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Mensagem</label>
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sale">Vendas</SelectItem>
                  <SelectItem value="delivery">Entregas</SelectItem>
                  <SelectItem value="reminder">Lembretes</SelectItem>
                  <SelectItem value="stock">Estoque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sent">Enviadas</SelectItem>
                  <SelectItem value="failed">Falhadas</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Telefone</label>
              <Input
                placeholder="Buscar por telefone..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
              />
            </div>
          </div>

          <Button className="w-full" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Notificações */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Nenhuma notificação encontrada com os filtros selecionados</p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notif) => (
            <Card key={notif.id}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getMessageTypeColor(notif.messageType)}>
                          {getMessageTypeLabel(notif.messageType)}
                        </Badge>
                        <Badge className={getStatusColor(notif.status)}>
                          {notif.status === "sent" ? "Enviada" : notif.status === "failed" ? "Falha" : "Pendente"}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-gray-700">{notif.phoneNumber}</p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{notif.sentAt.toLocaleString("pt-BR")}</p>
                      {notif.deliveredAt && (
                        <p className="text-xs text-green-600">
                          Entregue: {notif.deliveredAt.toLocaleTimeString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">{notif.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Enviadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{notifications.filter((n) => n.status === "sent").length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Falhadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{notifications.filter((n) => n.status === "failed").length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{notifications.filter((n) => n.status === "pending").length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {Math.round(
                (notifications.filter((n) => n.status === "sent").length / notifications.length) * 100
              )}
              %
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
