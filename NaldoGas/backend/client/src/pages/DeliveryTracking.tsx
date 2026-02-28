import { useState } from "react";
import OfflineMap from "@/components/OfflineMap";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Clock, CheckCircle, AlertCircle, Truck } from "lucide-react";

interface DeliveryMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  type: "delivery" | "customer" | "warehouse";
}

export default function DeliveryTracking() {
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);

  // Dados mockados de entregas em rota
  const deliveries = [
    {
      id: 1,
      customer: "João Silva",
      address: "Rua das Flores, 123 - Vila Velha",
      phone: "(27) 99999-1111",
      status: "in_route",
      deliverer: "Pedro",
      items: ["GLP 13Kg", "Água 20L"],
      amount: 250,
      estimatedTime: "14:30",
      lat: -20.3200,
      lng: -40.2750,
    },
    {
      id: 2,
      customer: "Maria Santos",
      address: "Av. Getúlio Vargas, 456 - Vila Velha",
      phone: "(27) 99999-2222",
      status: "pending",
      deliverer: "Carlos",
      items: ["GLP 13Kg"],
      amount: 180,
      estimatedTime: "15:00",
      lat: -20.3300,
      lng: -40.2800,
    },
    {
      id: 3,
      customer: "Pedro Oliveira",
      address: "Rua Principal, 789 - Vila Velha",
      phone: "(27) 99999-3333",
      status: "delivered",
      deliverer: "João",
      items: ["Água 20L", "Acessórios"],
      amount: 320,
      estimatedTime: "13:45",
      lat: -20.3100,
      lng: -40.2900,
    },
  ];

  // Converter entregas para marcadores do mapa
  const mapMarkers: DeliveryMarker[] = deliveries.map((delivery) => ({
    id: delivery.id.toString(),
    lat: delivery.lat,
    lng: delivery.lng,
    title: delivery.customer,
    description: delivery.address,
    type: "delivery",
  }));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">⏳ Pendente</Badge>;
      case "in_route":
        return <Badge className="bg-blue-100 text-blue-800">🚚 Em Rota</Badge>;
      case "delivered":
        return <Badge className="bg-green-100 text-green-800">✓ Entregue</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="text-yellow-600" size={20} />;
      case "in_route":
        return <Truck className="text-blue-600" size={20} />;
      case "delivered":
        return <CheckCircle className="text-green-600" size={20} />;
      default:
        return <AlertCircle className="text-gray-600" size={20} />;
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MapPin size={32} className="text-red-600" />
            Rastreamento de Entregas
          </h1>
          <p className="text-gray-600 mt-1">Acompanhe suas entregas em tempo real no mapa</p>
        </div>
      </div>

      {/* Mapa */}
      <Card className="p-4">
        <h2 className="text-xl font-bold mb-4">Mapa de Entregas - Vila Velha, ES</h2>
        <OfflineMap
          markers={mapMarkers}
          center={[-20.3155, -40.2806]}
          zoom={13}
          onMarkerClick={(marker) => {
            const delivery = deliveries.find((d) => d.id.toString() === marker.id);
            setSelectedDelivery(delivery);
          }}
          height="500px"
        />
        <p className="text-xs text-gray-500 mt-2">
          🔴 Vermelho = Entregas | 📦 Roxo = Depósito | Zoom para ver mais detalhes
        </p>
      </Card>

      {/* Abas de Visualização */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">Lista de Entregas</TabsTrigger>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        {/* Aba de Lista */}
        <TabsContent value="list" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliveries.map((delivery) => (
              <Card
                key={delivery.id}
                className={`p-4 cursor-pointer transition-all ${
                  selectedDelivery?.id === delivery.id ? "border-2 border-blue-500 bg-blue-50" : "hover:shadow-lg"
                }`}
                onClick={() => setSelectedDelivery(delivery)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{delivery.customer}</h3>
                    <p className="text-xs text-gray-500">{delivery.deliverer}</p>
                  </div>
                  {getStatusIcon(delivery.status)}
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={16} className="text-gray-500" />
                    <span className="text-gray-600 line-clamp-2">{delivery.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={16} className="text-gray-500" />
                    <span className="text-gray-600">{delivery.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={16} className="text-gray-500" />
                    <span className="text-gray-600">Estimado: {delivery.estimatedTime}</span>
                  </div>
                </div>

                <div className="mb-3">
                  {getStatusBadge(delivery.status)}
                </div>

                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Valor:</span>
                    <span className="font-bold text-green-600">R$ {delivery.amount.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Aba de Detalhes */}
        <TabsContent value="details" className="space-y-4">
          {selectedDelivery ? (
            <Card className="p-6">
              <div className="space-y-6">
                {/* Informações do Cliente */}
                <div>
                  <h3 className="text-lg font-bold mb-3">Informações do Cliente</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Nome</p>
                      <p className="font-semibold">{selectedDelivery.customer}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Telefone</p>
                      <p className="font-semibold">{selectedDelivery.phone}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Endereço</p>
                      <p className="font-semibold">{selectedDelivery.address}</p>
                    </div>
                  </div>
                </div>

                {/* Informações da Entrega */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-bold mb-3">Informações da Entrega</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Entregador</p>
                      <p className="font-semibold">{selectedDelivery.deliverer}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedDelivery.status)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Hora Estimada</p>
                      <p className="font-semibold">{selectedDelivery.estimatedTime}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Valor</p>
                      <p className="font-semibold text-green-600">R$ {selectedDelivery.amount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Itens da Entrega */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-bold mb-3">Itens</h3>
                  <ul className="space-y-2">
                    {selectedDelivery.items.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <span className="text-blue-600">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Ações */}
                <div className="border-t pt-4 flex gap-2">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700">
                    <Phone size={18} className="mr-2" />
                    Ligar para Cliente
                  </Button>
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                    <MapPin size={18} className="mr-2" />
                    Abrir Rota
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-gray-600">Selecione uma entrega na lista para ver os detalhes</p>
            </Card>
          )}
        </TabsContent>

        {/* Aba de Estatísticas */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-blue-50 border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Entregas Pendentes</p>
              <p className="text-3xl font-bold text-blue-600">
                {deliveries.filter((d) => d.status === "pending").length}
              </p>
            </Card>

            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <p className="text-sm text-gray-600 mb-1">Em Rota</p>
              <p className="text-3xl font-bold text-yellow-600">
                {deliveries.filter((d) => d.status === "in_route").length}
              </p>
            </Card>

            <Card className="p-4 bg-green-50 border-green-200">
              <p className="text-sm text-gray-600 mb-1">Entregues</p>
              <p className="text-3xl font-bold text-green-600">
                {deliveries.filter((d) => d.status === "delivered").length}
              </p>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">Resumo de Entregas</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>Total de Entregas</span>
                <span className="font-bold">{deliveries.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>Valor Total</span>
                <span className="font-bold text-green-600">
                  R$ {deliveries.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>Taxa de Conclusão</span>
                <span className="font-bold">
                  {Math.round((deliveries.filter((d) => d.status === "delivered").length / deliveries.length) * 100)}%
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
