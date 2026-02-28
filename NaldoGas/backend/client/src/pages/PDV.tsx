import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingCart, Plus, Minus, X, Search, User } from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  isContainer: boolean; // Se é um produto vasilhame (GLP 13Kg, Água 20L)
}

export default function PDV() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit_card" | "debit_card" | "pix" | "credit">("cash");
  const [salesChannel, setSalesChannel] = useState<"portaria" | "telegas" | "whatsapp">("portaria");
  const [discount, setDiscount] = useState(0);
  const [containerNotExchanged, setContainerNotExchanged] = useState(false); // Checkbox "Cliente não trouxe vasilhame vazio"

  // Queries
  const { data: products } = trpc.products.list.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();
  const createSaleMutation = trpc.sales.create.useMutation();
  const searchCustomerMutation = trpc.customers.searchByPhoneOrCpf.useMutation();

  // Filtrar produtos por busca
  const filteredProducts = products?.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Calcular totais
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal - discount;

  // Verificar se há vasilhames no carrinho
  const hasContainers = cart.some((item) => item.isContainer);

  // Recalcular preços do carrinho quando mudar forma de pagamento
  useEffect(() => {
    if (cart.length > 0 && products) {
      setCart(cart.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const newPrice = getPriceForPaymentMethod(product, paymentMethod);
          return {
            ...item,
            unitPrice: newPrice,
            subtotal: item.quantity * newPrice,
          };
        }
        return item;
      }));
    }
  }, [paymentMethod]); // Recalcula quando muda forma de pagamento

  // Buscar cliente por CPF ou Telefone
  const handleSearchCustomer = async () => {
    if (!customerSearch.trim()) {
      toast.error("Digite um CPF ou telefone para buscar");
      return;
    }

    try {
      const result = await searchCustomerMutation.mutateAsync({ search: customerSearch });
      if (result) {
        setSelectedCustomer(result.id);
        toast.success(`Cliente encontrado: ${result.name}`);
      } else {
        toast.error("Cliente não encontrado");
      }
    } catch (error) {
      toast.error("Erro ao buscar cliente");
    }
  };

  // Função para obter preço correto baseado na forma de pagamento
  const getPriceForPaymentMethod = (product: any, method: string) => {
    // PIX e Dinheiro usam priceCash (preço à vista)
    if (method === "pix" || method === "cash") {
      return parseFloat(product.priceCash || product.salePrice);
    }
    // Cartões usam priceCard
    if (method === "credit_card" || method === "debit_card") {
      return parseFloat(product.priceCard || product.salePrice);
    }
    // Fiado usa priceCard (preço padrão)
    return parseFloat(product.priceCard || product.salePrice);
  };

  // Adicionar produto ao carrinho
  const addToCart = (product: any) => {
    const price = getPriceForPaymentMethod(product, paymentMethod);
    const existingItem = cart.find((item) => item.productId === product.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * price,
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: price,
          subtotal: price,
          isContainer: product.isContainer || false,
        },
      ]);
    }
  };

  // Remover produto do carrinho
  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  // Atualizar quantidade
  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(
        cart.map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity,
                subtotal: quantity * item.unitPrice,
              }
            : item
        )
      );
    }
  };

  // Finalizar venda
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Carrinho vazio!");
      return;
    }

    try {
      await createSaleMutation.mutateAsync({
        customerId: selectedCustomer || undefined,
        totalAmount: total.toFixed(2),
        discount: discount.toFixed(2),
        paymentMethod,
        salesChannel,
        containerExchanged: hasContainers ? !containerNotExchanged : true, // Se tem vasilhame e NÃO marcou checkbox, trocou
        containerOwed: hasContainers && containerNotExchanged ? cart.filter(i => i.isContainer).reduce((sum, i) => sum + i.quantity, 0) : 0,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          subtotal: item.subtotal.toFixed(2),
        })),
      });

      // Limpar carrinho
      setCart([]);
      setDiscount(0);
      setSelectedCustomer(null);
      setCustomerSearch("");
      setContainerNotExchanged(false);
      toast.success("Venda realizada com sucesso!");
    } catch (error) {
      console.error("Erro ao finalizar venda:", error);
      toast.error("Erro ao finalizar venda");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 bg-gray-50 min-h-screen">
      {/* Seção de Produtos */}
      <div className="flex-1">
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="text-2xl font-bold mb-4">Venda Rápida (PDV)</h2>

          {/* Seleção de Canal de Venda */}
          <div className="mb-4">
            <label className="text-sm font-semibold mb-2 block">Canal de Venda</label>
            <Select value={salesChannel} onValueChange={(v: any) => setSalesChannel(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portaria">Venda na Portaria</SelectItem>
                <SelectItem value="telegas">TeleGás (Ligação)</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Busca de Cliente por CPF/Telefone */}
          <div className="mb-4">
            <label className="text-sm font-semibold mb-2 block">Buscar Cliente (CPF ou Telefone)</label>
            <div className="flex gap-2">
              <Input
                placeholder="Digite CPF ou telefone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSearchCustomer} disabled={searchCustomerMutation.isPending}>
                <User size={16} className="mr-2" />
                {searchCustomerMutation.isPending ? "Buscando..." : "Buscar"}
              </Button>
            </div>
            {selectedCustomer && (
              <div className="mt-2 text-sm text-green-600">
                ✓ Cliente selecionado: {customers?.find(c => c.id === selectedCustomer)?.name}
              </div>
            )}
          </div>

          {/* Busca de Produtos */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <Input
              placeholder="Buscar produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Grid de Produtos */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="p-3 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => addToCart(product)}
              >
                <div className="text-sm font-semibold truncate">{product.name}</div>
                {product.isContainer && (
                  <div className="text-xs text-blue-600 mt-1">🔄 Vasilhame</div>
                )}
                <div className="mt-2">
                  {product.priceCash && product.priceCard ? (
                    <>
                      <div className="text-xs text-gray-500 line-through">
                        R$ {parseFloat(product.priceCard).toFixed(2)}
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        R$ {parseFloat(product.priceCash).toFixed(2)}
                      </div>
                      <div className="text-xs text-green-600 font-semibold">
                        💵 Desconto PIX/Dinheiro
                      </div>
                    </>
                  ) : (
                    <div className="text-lg font-bold text-green-600">
                      R$ {parseFloat(product.salePrice || product.priceCard || product.priceCash || "0").toFixed(2)}
                    </div>
                  )}
                </div>
                <Button size="sm" className="w-full mt-2" variant="outline">
                  <Plus size={16} /> Adicionar
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Seção de Carrinho */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* Carrinho */}
        <Card className="p-4 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={24} />
            <h3 className="text-xl font-bold">Carrinho</h3>
          </div>

          {/* Itens do Carrinho */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Carrinho vazio</div>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm">
                      {item.name}
                      {item.isContainer && <span className="text-blue-600 ml-1">🔄</span>}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromCart(item.productId)}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    >
                      <Minus size={14} />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                      className="w-12 text-center"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    R$ {item.subtotal.toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkbox de Vasilhame */}
          {hasContainers && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="containerNotExchanged"
                  checked={containerNotExchanged}
                  onCheckedChange={(checked) => setContainerNotExchanged(checked as boolean)}
                />
                <label htmlFor="containerNotExchanged" className="text-sm cursor-pointer">
                  <div className="font-semibold">Cliente não trouxe vasilhame vazio</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {containerNotExchanged 
                      ? "⚠️ Cliente ficará devendo vasilhame" 
                      : "✓ Troca automática de vasilhame"}
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Forma de Pagamento */}
          <div className="mb-4">
            <label className="text-sm font-semibold mb-2 block">Forma de Pagamento</label>
            <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">💵 Dinheiro (à vista)</SelectItem>
                <SelectItem value="credit_card">💳 Cartão Crédito</SelectItem>
                <SelectItem value="debit_card">💳 Cartão Débito</SelectItem>
                <SelectItem value="pix">💱 PIX (à vista)</SelectItem>
                <SelectItem value="credit">📝 Fiado</SelectItem>
              </SelectContent>
            </Select>
            {(paymentMethod === "cash" || paymentMethod === "pix") && (
              <div className="mt-2 text-xs text-green-600 font-semibold bg-green-50 p-2 rounded">
                ✅ Preço à vista aplicado! Economia garantida.
              </div>
            )}
            {(paymentMethod === "credit_card" || paymentMethod === "debit_card") && (
              <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                💳 Preço padrão para cartão.
              </div>
            )}
          </div>

          {/* Desconto */}
          <div className="mb-4">
            <label className="text-sm font-semibold mb-2 block">Desconto (R$)</label>
            <Input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              min="0"
            />
          </div>

          {/* Totais */}
          <div className="bg-gray-50 p-3 rounded-lg mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Desconto:</span>
              <span>-R$ {discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-green-600">R$ {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Botão de Finalizar */}
          <Button
            onClick={handleCheckout}
            disabled={cart.length === 0 || createSaleMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3"
          >
            {createSaleMutation.isPending ? "Processando..." : "Finalizar Venda"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
