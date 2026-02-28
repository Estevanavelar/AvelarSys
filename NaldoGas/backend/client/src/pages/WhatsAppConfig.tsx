import { useState, useEffect } from "react";
import { MessageCircle, QrCode, CheckCircle, AlertCircle, Settings, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const TEMPLATE_TYPES = [
  { value: "sale", label: "Notificação de Venda" },
  { value: "delivery", label: "Entrega Pendente" },
  { value: "reminder", label: "Lembrete de Pagamento" },
  { value: "stock", label: "Estoque Baixo" },
];

const AVAILABLE_VARIABLES = {
  sale: ["{customerName}", "{totalAmount}", "{productList}", "{paymentMethod}", "{saleChannel}"],
  delivery: ["{customerName}", "{address}", "{deliveryDate}", "{totalAmount}"],
  reminder: ["{customerName}", "{dueAmount}", "{dueDate}"],
  stock: ["{productName}", "{currentStock}", "{minStock}"],
};

export default function WhatsAppConfig() {
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected");
  const [isConnecting, setIsConnecting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeTimer, setQrCodeTimer] = useState(0);
  const [config, setConfig] = useState<any>({});
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Timer para QR Code
  useEffect(() => {
    if (qrCodeTimer > 0) {
      const timer = setTimeout(() => setQrCodeTimer(qrCodeTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (qrCodeTimer === 0 && qrCode) {
      setQrCode(null);
      setConnectionStatus("disconnected");
      setIsConnecting(false);
    }
  }, [qrCodeTimer, qrCode]);

  const handleConnectWhatsApp = async () => {
    setIsConnecting(true);
    setConnectionStatus("connecting");
    try {
      // Gerar QR Code simulado
      const simulatedQRCode = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='white'/%3E%3Crect x='20' y='20' width='80' height='80' fill='black'/%3E%3Crect x='30' y='30' width='60' height='60' fill='white'/%3E%3Crect x='35' y='35' width='50' height='50' fill='black'/%3E%3Crect x='200' y='20' width='80' height='80' fill='black'/%3E%3Crect x='210' y='30' width='60' height='60' fill='white'/%3E%3Crect x='215' y='35' width='50' height='50' fill='black'/%3E%3Crect x='20' y='200' width='80' height='80' fill='black'/%3E%3Crect x='30' y='210' width='60' height='60' fill='white'/%3E%3Crect x='35' y='215' width='50' height='50' fill='black'/%3E%3Crect x='120' y='120' width='60' height='60' fill='black'/%3E%3C/svg%3E";
      
      setQrCode(simulatedQRCode);
      setQrCodeTimer(30);
      toast.info("Escaneie o QR Code com seu WhatsApp");
    } catch (error) {
      setConnectionStatus("disconnected");
      setQrCode(null);
      toast.error("Erro ao gerar QR Code");
      setIsConnecting(false);
    }
  };

  const handleDisconnectWhatsApp = () => {
    setConnectionStatus("disconnected");
    setQrCode(null);
    setQrCodeTimer(0);
    toast.success("WhatsApp desconectado");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="w-8 h-8" />
            Configuração WhatsApp
          </h1>
          <p className="text-gray-600 mt-2">Configure e conecte seu WhatsApp para notificações automáticas</p>
        </div>
      </div>

      {/* Status de Conexão */}
      <Card className={`border-2 ${connectionStatus === "connected" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              {connectionStatus === "connected" ? (
                <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
              )}
              <div>
                <h3 className={`font-semibold ${connectionStatus === "connected" ? "text-green-900" : "text-red-900"}`}>
                  {connectionStatus === "connected" ? "WhatsApp Conectado" : "WhatsApp Desconectado"}
                </h3>
                <p className={`text-sm mt-1 ${connectionStatus === "connected" ? "text-green-800" : "text-red-800"}`}>
                  {connectionStatus === "connected" 
                    ? "Seu WhatsApp está conectado e pronto para enviar notificações automáticas"
                    : "Conecte seu WhatsApp para ativar as notificações automáticas do sistema"}
                </p>
              </div>
            </div>
            {connectionStatus === "connected" ? (
              <Button 
                onClick={handleDisconnectWhatsApp}
                variant="destructive"
                disabled={isConnecting}
              >
                Desconectar
              </Button>
            ) : (
              <Button 
                onClick={handleConnectWhatsApp}
                disabled={isConnecting}
                className="gap-2"
              >
                <QrCode className="w-4 h-4" />
                {isConnecting ? "Aguardando QR Code..." : "Conectar WhatsApp"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QR Code Display */}
      {qrCode && connectionStatus === "connecting" && (
        <Card className="border-2 border-blue-500 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <h3 className="text-lg font-semibold text-center">Escaneie o QR Code com seu WhatsApp</h3>
              <div className="bg-white p-4 rounded-lg border-2 border-blue-200 shadow-lg">
                <img 
                  src={qrCode} 
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64"
                />
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-700 font-medium">Instruções:</p>
                <ol className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>1. Abra o WhatsApp no seu telefone</li>
                  <li>2. Vá em Configurações → Dispositivos Vinculados</li>
                  <li>3. Clique em "Vincular um dispositivo"</li>
                  <li>4. Escaneie este QR Code com a câmera</li>
                </ol>
              </div>
              <div className="w-full max-w-xs">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Tempo restante:</p>
                  <p className="text-sm font-bold text-blue-600">{qrCodeTimer}s</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
                    style={{width: `${(qrCodeTimer / 30) * 100}%`}}
                  ></div>
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center">Aguardando confirmação...</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados de Conexão WhatsApp</CardTitle>
              <CardDescription>Configure os números para envio de notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business-phone">Número de Negócio (Seu WhatsApp)</Label>
                <Input
                  id="business-phone"
                  placeholder="Ex: 5527999999999"
                  defaultValue=""
                />
                <p className="text-sm text-gray-500">
                  Número WhatsApp que será usado para enviar mensagens
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification-phone">Número para Notificações</Label>
                <Input
                  id="notification-phone"
                  placeholder="Ex: 5527999999999"
                  defaultValue=""
                />
                <p className="text-sm text-gray-500">
                  Número que receberá as notificações de vendas e alertas
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label htmlFor="enable-notifications">Ativar Notificações</Label>
                  <p className="text-sm text-gray-500">
                    Enviar notificações automaticamente
                  </p>
                </div>
                <Switch id="enable-notifications" />
              </div>

              <Button className="w-full">
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Templates de Mensagens</CardTitle>
              <CardDescription>Crie e customize os templates de notificações automáticas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Novo Template
              </Button>
              
              <div className="space-y-2">
                {TEMPLATE_TYPES.map((type) => (
                  <div key={type.value} className="p-3 border rounded-lg hover:bg-gray-50">
                    <p className="font-medium text-sm">{type.label}</p>
                    <p className="text-xs text-gray-500 mt-1">Clique para editar</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
