import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { Package, Tag, Settings, Plus, ExternalLink, Store } from "lucide-react";

export default function CatalogManagement() {
  const [activeTab, setActiveTab] = useState("orders");

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Gestão de Catálogo Público</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie pedidos, cupons e configurações da loja online
          </p>
        </div>
        <Button
          onClick={() => window.open("/catalog", "_blank")}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Store className="h-4 w-4" />
          Visualizar Loja
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Pedidos</span>
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Cupons</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <OrdersTab />
        </TabsContent>

        <TabsContent value="coupons">
          <CouponsTab />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Aba de Pedidos Recebidos
function OrdersTab() {
  const { data: orders, isLoading, refetch } = trpc.publicCatalog.listOrders.useQuery();
  const updateOrderStatus = trpc.publicCatalog.updateOrderStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar status");
    },
  });
  const [pendingStatus, setPendingStatus] = useState<{ orderId: number; status: string } | null>(null);

  if (isLoading) {
    return <div className="text-center py-8">Carregando pedidos...</div>;
  }

  if (!orders || orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum pedido recebido ainda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">Pedido #{order.id}</CardTitle>
                <CardDescription>
                  {order.customer?.name} • {order.customer?.phone}
                </CardDescription>
              </div>
              <Badge variant={order.status === "pending" ? "secondary" : "default"}>
                {order.status === "pending" && "Pendente"}
                {order.status === "confirmed" && "Confirmado"}
                {order.status === "in_delivery" && "Em Entrega"}
                {order.status === "delivered" && "Entregue"}
                {order.status === "cancelled" && "Cancelado"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Itens do Pedido:</h4>
              <div className="space-y-1">
                {(order.items as any[]).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.productName}
                    </span>
                    <span className="font-medium">R$ {item.subtotal}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Subtotal:</span>
                <span>R$ {order.subtotal}</span>
              </div>
              {parseFloat(order.discount) > 0 && (
                <div className="flex justify-between text-sm mb-1 text-green-600">
                  <span>Desconto ({order.couponCode}):</span>
                  <span>- R$ {order.discount}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>R$ {order.total}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Endereço de Entrega:</h4>
              <p className="text-sm text-muted-foreground">
                {(order.deliveryAddress as any).street}, {(order.deliveryAddress as any).number}
                {(order.deliveryAddress as any).complement && ` - ${(order.deliveryAddress as any).complement}`}
                <br />
                {(order.deliveryAddress as any).neighborhood} - {(order.deliveryAddress as any).city}/{(order.deliveryAddress as any).state}
                <br />
                CEP: {(order.deliveryAddress as any).zipCode}
              </p>
            </div>

            {order.notes && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Observações:</h4>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Pedido realizado em: {new Date(order.createdAt).toLocaleString("pt-BR")}
            </div>

            <div className="border-t pt-4 flex items-center gap-2">
              <Label htmlFor={`status-${order.id}`} className="text-sm font-medium">
                Atualizar Status:
              </Label>
              <Select
                value={order.status}
                onValueChange={(newStatus) => {
                  setPendingStatus({ orderId: order.id, status: newStatus });
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                  <SelectItem value="in_transit">Em Trânsito</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ))}
      <AlertDialog open={!!pendingStatus} onOpenChange={(open) => !open && setPendingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar status do pedido</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja alterar o status para &quot;{pendingStatus?.status}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingStatus) {
                  updateOrderStatus.mutate({ orderId: pendingStatus.orderId, status: pendingStatus.status as any });
                  setPendingStatus(null);
                }
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Aba de Cupons
function CouponsTab() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data: coupons, isLoading, refetch } = trpc.publicCatalog.listCoupons.useQuery();
  const toggleCoupon = trpc.publicCatalog.toggleCoupon.useMutation({
    onSuccess: () => {
      toast.success("Cupom atualizado!");
      refetch();
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Carregando cupons...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Cupons de Desconto</h3>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cupom
        </Button>
      </div>

      {showCreateForm && <CreateCouponForm onSuccess={() => { setShowCreateForm(false); refetch(); }} />}

      {!coupons || coupons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum cupom criado ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {coupons.map((coupon) => (
            <Card key={coupon.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-mono">{coupon.code}</CardTitle>
                    <CardDescription>
                      {coupon.discountType === "percentage"
                        ? `${coupon.discountValue}% de desconto`
                        : `R$ ${coupon.discountValue} de desconto`}
                    </CardDescription>
                  </div>
                  <Badge variant={coupon.isActive ? "default" : "secondary"}>
                    {coupon.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Valor mínimo:</span> R$ {coupon.minPurchaseAmount}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Usos:</span> {coupon.usedCount}
                  {coupon.maxUses && ` / ${coupon.maxUses}`}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Validade:</span>{" "}
                  {new Date(coupon.validFrom).toLocaleDateString("pt-BR")} até{" "}
                  {new Date(coupon.validUntil).toLocaleDateString("pt-BR")}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => toggleCoupon.mutate({ id: coupon.id, isActive: !coupon.isActive })}
                >
                  {coupon.isActive ? "Desativar" : "Ativar"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Formulário de Criar Cupom
function CreateCouponForm({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minPurchaseAmount, setMinPurchaseAmount] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const createCoupon = trpc.publicCatalog.createCoupon.useMutation({
    onSuccess: () => {
      toast.success("Cupom criado com sucesso!");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar cupom");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCoupon.mutate({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      minPurchaseAmount: minPurchaseAmount || "0",
      maxUses: maxUses ? parseInt(maxUses) : undefined,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Novo Cupom</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="code">Código do Cupom</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="EX: PRIMEIRACOMPRA"
                required
              />
            </div>
            <div>
              <Label htmlFor="discountType">Tipo de Desconto</Label>
              <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentual (%)</SelectItem>
                  <SelectItem value="fixed_amount">Valor Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="discountValue">Valor do Desconto</Label>
              <Input
                id="discountValue"
                type="number"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percentage" ? "10" : "15.00"}
                required
              />
            </div>
            <div>
              <Label htmlFor="minPurchaseAmount">Valor Mínimo de Compra (R$)</Label>
              <Input
                id="minPurchaseAmount"
                type="number"
                step="0.01"
                value={minPurchaseAmount}
                onChange={(e) => setMinPurchaseAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="maxUses">Limite de Usos (opcional)</Label>
              <Input
                id="maxUses"
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Ilimitado"
              />
            </div>
            <div>
              <Label htmlFor="validFrom">Válido de</Label>
              <Input
                id="validFrom"
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="validUntil">Válido até</Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={createCoupon.isPending}>
              {createCoupon.isPending ? "Criando..." : "Criar Cupom"}
            </Button>
            <Button type="button" variant="outline" onClick={onSuccess}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Aba de Configurações
function SettingsTab() {
  const { data: settings, refetch } = trpc.publicCatalog.getSettings.useQuery();
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [catalogDomain, setCatalogDomain] = useState("");
  const [cloudflareApiToken, setCloudflareApiToken] = useState("");
  const [cloudflareZoneId, setCloudflareZoneId] = useState("");

  // Carregar configurações quando disponíveis
  useEffect(() => {
    if (settings) {
      setWhatsappNumber(settings.whatsappNumber || "");
      setCatalogDomain(settings.customDomain || "");
      setCloudflareApiToken(settings.cloudflareApiToken || "");
      setCloudflareZoneId(settings.cloudflareZoneId || "");
    }
  }, [settings]);

  const updateSettings = trpc.publicCatalog.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao salvar configurações");
    },
  });

  const handleSaveWhatsApp = () => {
    if (!whatsappNumber.trim()) {
      toast.error("Digite um número de WhatsApp válido");
      return;
    }
    updateSettings.mutate({ whatsappNumber });
  };

  const handleSaveCloudflare = () => {
    updateSettings.mutate({
      customDomain: catalogDomain,
      cloudflareApiToken,
      cloudflareZoneId,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp da Loja</CardTitle>
          <CardDescription>
            Número do WhatsApp para onde os pedidos serão enviados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="whatsapp">Número do WhatsApp (com DDI)</Label>
            <Input
              id="whatsapp"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="5511999999999"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Formato: 55 (país) + 11 (DDD) + 999999999 (número)
            </p>
          </div>
          <Button onClick={handleSaveWhatsApp} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? "Salvando..." : "Salvar WhatsApp"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Domínio Personalizado (Cloudflare)</CardTitle>
          <CardDescription>
            Configure um domínio personalizado para sua loja online
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="domain">Domínio Desejado</Label>
            <Input
              id="domain"
              value={catalogDomain}
              onChange={(e) => setCatalogDomain(e.target.value)}
              placeholder="loja.naldogas.com.br"
            />
          </div>
          <div>
            <Label htmlFor="apiToken">Cloudflare API Token</Label>
            <Input
              id="apiToken"
              type="password"
              value={cloudflareApiToken}
              onChange={(e) => setCloudflareApiToken(e.target.value)}
              placeholder="••••••••••••••••"
            />
            <p className="text-xs text-muted-foreground mt-1">
              <a
                href="https://dash.cloudflare.com/profile/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Obter API Token <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
          <div>
            <Label htmlFor="zoneId">Cloudflare Zone ID</Label>
            <Input
              id="zoneId"
              value={cloudflareZoneId}
              onChange={(e) => setCloudflareZoneId(e.target.value)}
              placeholder="••••••••••••••••"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Encontre o Zone ID no painel do Cloudflare, na seção "API" do seu domínio
            </p>
          </div>
          <Button onClick={handleSaveCloudflare} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Status da Conexão:</h4>
            <Badge variant="secondary">Não Configurado</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
