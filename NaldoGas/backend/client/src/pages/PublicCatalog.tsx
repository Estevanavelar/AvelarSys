import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, Trash2, Tag, Package } from "lucide-react";

interface CartItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  subtotal: number;
}

export default function PublicCatalog() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);

  const { data: products, isLoading } = trpc.publicCatalog.listProducts.useQuery();

  const addToCart = (product: any) => {
    const existingItem = cart.find((item) => item.productId === product.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * parseFloat(item.unitPrice),
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.salePrice,
          subtotal: parseFloat(product.salePrice),
        },
      ]);
    }

    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.productId === productId) {
            const newQuantity = item.quantity + delta;
            if (newQuantity <= 0) return null;
            return {
              ...item,
              quantity: newQuantity,
              subtotal: newQuantity * parseFloat(item.unitPrice),
            };
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.productId !== productId));
    toast.success("Item removido do carrinho");
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  if (showCheckout) {
    return <CheckoutForm cart={cart} cartTotal={cartTotal} onBack={() => setShowCheckout(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">NaldoGás</h1>
            <p className="text-sm text-muted-foreground">Catálogo de Produtos</p>
          </div>
          <Button
            onClick={() => setShowCheckout(true)}
            disabled={cart.length === 0}
            className="relative"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Carrinho
            {cartItemCount > 0 && (
              <Badge className="ml-2 bg-red-500">{cartItemCount}</Badge>
            )}
          </Button>
        </div>
      </header>

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-8">
        {!products || products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum produto disponível no momento</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <Card key={product.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  {product.description && (
                    <CardDescription className="line-clamp-2">{product.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-green-600">
                      R$ {parseFloat(product.salePrice).toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Estoque: {product.stockQuantity} unidades
                  </div>
                  {product.isContainer && (
                    <Badge variant="secondary" className="mt-2">
                      Vasilhame
                    </Badge>
                  )}
                </CardContent>
                <CardFooter>
                  <Button onClick={() => addToCart(product)} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 max-w-sm">
          <h3 className="font-semibold mb-2">Carrinho ({cartItemCount} itens)</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
            {cart.map((item) => (
              <div key={item.productId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateQuantity(item.productId, -1)}
                    className="h-6 w-6 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="font-medium">{item.quantity}x</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateQuantity(item.productId, 1)}
                    className="h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <span className="truncate max-w-[120px]">{item.productName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">R$ {item.subtotal.toFixed(2)}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFromCart(item.productId)}
                    className="h-6 w-6 p-0 text-red-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 flex justify-between items-center font-bold">
            <span>Total:</span>
            <span className="text-green-600">R$ {cartTotal.toFixed(2)}</span>
          </div>
          <Button onClick={() => setShowCheckout(true)} className="w-full mt-3">
            Finalizar Pedido
          </Button>
        </div>
      )}
    </div>
  );
}

// Formulário de Checkout
function CheckoutForm({
  cart,
  cartTotal,
  onBack,
}: {
  cart: CartItem[];
  cartTotal: number;
  onBack: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discount, setDiscount] = useState(0);

  const validateCoupon = trpc.publicCatalog.validateCoupon.useMutation({
    onSuccess: (data) => {
      if (data && "error" in data) {
        toast.error(data.error);
      } else if (data) {
        setAppliedCoupon(data);
        const discountAmount =
          data.discountType === "percentage"
            ? (cartTotal * parseFloat(data.discountValue)) / 100
            : parseFloat(data.discountValue);
        setDiscount(discountAmount);
        toast.success(`Cupom aplicado! Desconto de R$ ${discountAmount.toFixed(2)}`);
      }
    },
    onError: () => {
      toast.error("Cupom inválido");
    },
  });

  const { data: whatsappData } = trpc.publicCatalog.getWhatsappNumber.useQuery();

  const createOrder = trpc.publicCatalog.createOrder.useMutation({
    onSuccess: (order) => {
      // Gerar mensagem WhatsApp
      const whatsappNumber = whatsappData?.whatsappNumber || "5511999999999";
      const message = generateWhatsAppMessage(order, cart, customerName, customerPhone);
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      toast.success("Pedido realizado com sucesso!");
      window.open(whatsappUrl, "_blank");

      // Redirecionar de volta ao catálogo
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar pedido");
    },
  });

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      toast.error("Digite um código de cupom");
      return;
    }
    validateCoupon.mutate({ code: couponCode.toUpperCase(), purchaseAmount: cartTotal });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const total = cartTotal - discount;

    createOrder.mutate({
      customerName,
      customerPhone,
      customerEmail: customerEmail || undefined,
      items: cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal.toFixed(2),
      })),
      subtotal: cartTotal.toFixed(2),
      discount: discount.toFixed(2),
      total: total.toFixed(2),
      couponCode: appliedCoupon?.code,
      deliveryAddress: {
        street,
        number,
        complement: complement || undefined,
        neighborhood,
        city,
        state,
        zipCode,
      },
      notes: notes || undefined,
    });
  };

  const total = cartTotal - discount;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <Button variant="outline" onClick={onBack} className="mb-6">
          ← Voltar ao Catálogo
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Finalizar Pedido</CardTitle>
            <CardDescription>Preencha seus dados para confirmar o pedido</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados do Cliente */}
              <div>
                <h3 className="font-semibold mb-3">Dados do Cliente</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="email">E-mail (opcional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Endereço de Entrega */}
              <div>
                <h3 className="font-semibold mb-3">Endereço de Entrega</h3>
                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="sm:col-span-3">
                      <Label htmlFor="street">Rua *</Label>
                      <Input
                        id="street"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="number">Número *</Label>
                      <Input
                        id="number"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="neighborhood">Bairro *</Label>
                      <Input
                        id="neighborhood"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">Estado *</Label>
                      <Input
                        id="state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="SP"
                        maxLength={2}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">CEP *</Label>
                      <Input
                        id="zipCode"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        placeholder="00000-000"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ponto de referência, instruções de entrega, etc."
                  rows={3}
                />
              </div>

              {/* Cupom de Desconto */}
              <div>
                <Label htmlFor="coupon">Cupom de Desconto</Label>
                <div className="flex gap-2">
                  <Input
                    id="coupon"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="DIGITE SEU CUPOM"
                    disabled={!!appliedCoupon}
                  />
                  {!appliedCoupon ? (
                    <Button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={validateCoupon.isPending}
                    >
                      <Tag className="h-4 w-4 mr-2" />
                      Aplicar
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setDiscount(0);
                        setCouponCode("");
                      }}
                    >
                      Remover
                    </Button>
                  )}
                </div>
                {appliedCoupon && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Cupom aplicado: {appliedCoupon.code}
                  </p>
                )}
              </div>

              {/* Resumo do Pedido */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Resumo do Pedido</h3>
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.productName}
                      </span>
                      <span className="font-medium">R$ {item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Subtotal:</span>
                      <span>R$ {cartTotal.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm mb-1 text-green-600">
                        <span>Desconto:</span>
                        <span>- R$ {discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span className="text-green-600">R$ {total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={createOrder.isPending}>
                {createOrder.isPending ? "Processando..." : "Confirmar Pedido no WhatsApp"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Gerar mensagem WhatsApp
function generateWhatsAppMessage(order: any, cart: CartItem[], name: string, phone: string) {
  const items = cart.map((item) => `• ${item.quantity}x ${item.productName} - R$ ${item.subtotal.toFixed(2)}`).join("\n");

  const address = order.deliveryAddress;
  const addressText = `${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ""}\n${address.neighborhood} - ${address.city}/${address.state}\nCEP: ${address.zipCode}`;

  return `🛒 *Novo Pedido - NaldoGás*

*Cliente:* ${name}
*Telefone:* ${phone}

*Itens do Pedido:*
${items}

*Subtotal:* R$ ${order.subtotal}
${parseFloat(order.discount) > 0 ? `*Desconto:* -R$ ${order.discount}\n` : ""}*Total:* R$ ${order.total}

*Endereço de Entrega:*
${addressText}

${order.notes ? `*Observações:*\n${order.notes}\n\n` : ""}Pedido #${order.id}`;
}
