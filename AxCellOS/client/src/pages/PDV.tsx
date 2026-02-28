import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  ShoppingCart, Plus, Trash2, DollarSign, CreditCard, 
  RefreshCw, Check, ImageIcon, Smile 
} from 'lucide-react';
import ResponsiveLayout from '@/components/ResponsiveLayout';
import CreateProductDialog from '@/components/CreateProductDialog';
import ImageUploadField from '@/components/ImageUploadField';
import { uploadImageFile } from '@/lib/storage';
import { LinkCustomerDialog } from '@/components/LinkCustomerDialog';
import { ReceiptPrinter, ReceiptData } from '@/components/ReceiptPrinter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProducts } from '@/contexts/ProductsContext';
import { trpc } from '@/lib/trpc';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  imageBase64?: string;
}

const PRODUCT_CATEGORIES = [
  'Acessórios',
  'Carregadores',
  'Capas e Películas',
  'Baterias',
  'Cabos',
  'Fones',
  'Suportes',
  'Outros',
];

export default function PDV() {
  const { products, updateProduct, refreshProducts } = useProducts();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showLinkCustomer, setShowLinkCustomer] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'debit' | 'pix'>('cash');
  const [installments, setInstallments] = useState(1);
  
  const { data: feesSetting } = trpc.settings.getSetting.useQuery({ key: 'fees' });
  const feeSettings = useMemo(() => {
    const fromApi = feesSetting?.value as any;
    if (fromApi) return fromApi;
    try {
      const raw = localStorage.getItem('axcellos_fees');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [feesSetting?.value]);
  const createSaleMutation = trpc.sales.createSale.useMutation();

  const calculateNetValue = (total: number, method: string, inst: number) => {
    if (!feeSettings) return { net: total, fee: 0, percent: 0 };
    let feePercent = 0;
    if (method === 'debit') feePercent = feeSettings.debit;
    else if (method === 'credit') {
      if (inst === 1) feePercent = feeSettings.credit1x;
      else feePercent = feeSettings.installments[inst] || 0;
    }
    const feeAmount = (total * feePercent) / 100;
    return {
      net: total - feeAmount,
      fee: feeAmount,
      percent: feePercent
    };
  };
  const [lastSaleData, setLastSaleData] = useState<ReceiptData | null>(null);
  const [receiptFormat, setReceiptFormat] = useState<'58mm' | '80mm'>('58mm');
  const [quickEditProduct, setQuickEditProduct] = useState<any | null>(null);
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickEditImage, setQuickEditProductImage] = useState<{ file: File, result: any } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const ignoreNextClickRef = useRef(false);
  const paginatorRef = useRef<HTMLDivElement | null>(null);
  const productsContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

  const filteredProducts = products.filter((product: any) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const perPage = isMobile ? 4 : 6;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / perPage));

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const updateIsMobile = () => setIsMobile(mediaQuery.matches);
    updateIsMobile();
    mediaQuery.addEventListener('change', updateIsMobile);
    return () => mediaQuery.removeEventListener('change', updateIsMobile);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    if (productsContainerRef.current) {
      productsContainerRef.current.scrollTo({ left: 0 });
    }
  }, [searchTerm, perPage]);

  const handleProductsScroll = () => {
    const container = productsContainerRef.current;
    if (!container) return;

    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      const scrollLeft = container.scrollLeft;
      const width = container.offsetWidth;
      const pageIndex = Math.round(scrollLeft / width);
      const nextPage = pageIndex + 1;
      if (nextPage !== currentPage) {
        setCurrentPage(nextPage);
      }
    }, 100);
  };

  const scrollToPage = (page: number) => {
    const container = productsContainerRef.current;
    if (!container) return;
    const width = container.offsetWidth;
    container.scrollTo({
      left: (page - 1) * width,
      behavior: 'smooth'
    });
    setCurrentPage(page);
  };

  const addToCart = (product: any) => {
    const existingItem = cart.find((item) => item.id === product.id);
    const totalInCart = existingItem?.quantity ?? 0;
    if (product.quantity !== undefined && product.quantity > 0 && totalInCart + 1 > product.quantity) {
      alert(`Estoque insuficiente para "${product.name}"`);
      return;
    }

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          imageUrl: (product as any).imageUrl,
          imageBase64: (product as any).imageBase64,
        },
      ]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      const product = products.find((p) => p.id === id);
      if (product && product.quantity !== undefined && product.quantity > 0 && quantity > product.quantity) {
        alert(`Estoque insuficiente para "${product.name}"`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === id ? { ...item, quantity } : item
        )
      );
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const netInfo = calculateNetValue(total, paymentMethod, installments);

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Carrinho vazio!');
      return;
    }

    const receiptData: ReceiptData = {
      id: `VDA-${Date.now()}`,
      date: new Date(),
      items: cart.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      })),
      subtotal: total,
      tax: netInfo.fee,
      total: total,
      paymentMethod,
      installments: paymentMethod === 'credit' ? installments : 1,
      netValue: netInfo.net,
      feePercent: netInfo.percent
    };

    setLastSaleData(receiptData);
    setShowLinkCustomer(true);
  };

  const handleCustomerLinked = async (customerName: string, customerCPF: string) => {
    if (lastSaleData) {
      const cleanCustomerCPF = customerCPF.replace(/\D/g, '');
      const updatedSaleData: ReceiptData = {
        ...lastSaleData,
        customerName,
        customerCPF: cleanCustomerCPF,
      };

      try {
        await createSaleMutation.mutateAsync({
          customerId: cleanCustomerCPF.length === 11 ? cleanCustomerCPF : undefined,
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: item.price,
            discount: 0,
          })),
          discount: 0,
          paymentMethod,
          paymentStatus: 'paid',
          installments: paymentMethod === 'credit' ? installments : 1,
          feeAmount: netInfo.fee,
          feePercent: netInfo.percent,
          netValue: netInfo.net,
        });

        setLastSaleData(updatedSaleData);
        setShowReceipt(true);
        setCart([]);
        await refreshProducts();
      } catch (error) {
        console.error('Erro ao salvar venda:', error);
        alert('Falha ao salvar a venda. Tente novamente.');
      }
    }
  };

  const startLongPress = (product: any) => {
    longPressTimerRef.current = window.setTimeout(() => {
      // Evita clique residual após long press no mobile.
      ignoreNextClickRef.current = true;
      setQuickEditProduct({
        ...product,
        activeMode: product.imageUrl || product.imageBase64 ? 'image' : 'emoji',
        emoji: product.emojiIcon || product.image || '📦'
      });
      setQuickEditProductImage(null);
      setShowQuickEdit(true);
      longPressTimerRef.current = null;
    }, 600); // 600ms para considerar long press
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleQuickEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quickEditProduct) {
      setIsSubmitting(true);
      try {
        let finalImageUrl = quickEditProduct.imageUrl;

        // Se uma nova imagem foi selecionada, faz o upload
        if (quickEditProduct.activeMode === 'image' && quickEditImage?.result?.file) {
          finalImageUrl = await uploadImageFile(quickEditImage.result.file);
        }

        updateProduct(quickEditProduct.id, {
          name: quickEditProduct.name,
          price: Number(quickEditProduct.price),
          cost: Number(quickEditProduct.cost),
          quantity: Number(quickEditProduct.quantity),
          minStock: Number(quickEditProduct.minStock || 0),
          emojiIcon: quickEditProduct.activeMode === 'emoji' ? quickEditProduct.emoji : undefined,
          imageUrl: quickEditProduct.activeMode === 'image' ? finalImageUrl : undefined,
        });
        setShowQuickEdit(false);
        setQuickEditProduct(null);
        setQuickEditProductImage(null);
      } catch (error) {
        console.error('Erro ao salvar edição rápida:', error);
        alert('Falha ao salvar as alterações. Tente novamente.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <ResponsiveLayout activeTab="pdv">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">🛍️ Ponto de Venda</h1>
            <p className="text-muted-foreground mt-1">Gerencie suas vendas com facilidade</p>
          </div>
          <Button
            onClick={() => setShowCreateProduct(true)}
            className="gap-2 bg-amber-600 hover:bg-amber-700 rounded-full"
          >
            <Plus className="w-5 h-5" />
            Novo Produto
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Produtos */}
          <div className="lg:col-span-2 space-y-4">
            {/* Busca */}
            <Input
              placeholder="🔍 Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-xl h-12"
            />

            {/* Grid de Produtos - Slider Version */}
            <div 
              ref={productsContainerRef}
              onScroll={handleProductsScroll}
              className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar gap-0"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {Array.from({ length: totalPages }, (_, pageIdx) => {
                const pageProducts = filteredProducts.slice(pageIdx * perPage, (pageIdx + 1) * perPage);
                return (
                  <div 
                    key={pageIdx} 
                    className="min-w-full grid grid-cols-2 sm:grid-cols-3 gap-3 snap-center px-1"
                  >
                    {pageProducts.map((product: any) => (
                      <button
                        key={product.id}
                        onClick={() => {
                          if (ignoreNextClickRef.current) {
                            ignoreNextClickRef.current = false;
                            return;
                          }
                          if (!longPressTimerRef.current && !showQuickEdit) {
                            addToCart(product);
                          }
                        }}
                        onMouseDown={() => startLongPress(product)}
                        onMouseUp={cancelLongPress}
                        onMouseLeave={cancelLongPress}
                        onTouchStart={() => startLongPress(product)}
                        onTouchEnd={cancelLongPress}
                        onTouchCancel={cancelLongPress}
                        className="bg-card border border-border rounded-2xl p-4 hover:border-amber-500 hover:shadow-lg transition-all select-none active:scale-95"
                      >
                        {product.imageUrl || product.imageBase64 ? (
                          <img
                            src={product.imageUrl || product.imageBase64}
                            alt={product.name}
                            className="w-full h-24 object-cover rounded-lg mb-2"
                          />
                        ) : (
                          <div className="text-4xl mb-2">{product.emojiIcon || product.image || '📦'}</div>
                        )}
                        <p className="font-semibold text-foreground text-sm line-clamp-2">
                          {product.name}
                        </p>
                        <p className="text-amber-600 font-bold mt-2">
                          R$ {product.price.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-1">
                          Estoque: {product.quantity ?? 0}
                        </p>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Paginador Centralizado */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, index) => {
                  const page = index + 1;
                  const isActive = page === currentPage;
                  return (
                    <button
                      key={page}
                      onClick={() => scrollToPage(page)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        isActive
                          ? 'bg-amber-600 w-8'
                          : 'bg-muted hover:bg-amber-400'
                      }`}
                      aria-label={`Ir para página ${page}`}
                    />
                  );
                })}
              </div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Página {currentPage} de {totalPages}
              </p>
            </div>
          </div>

          {/* Carrinho */}
          <div className="bg-card border border-border rounded-2xl p-6 h-fit sticky top-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-amber-600" />
              <h2 className="text-xl font-bold text-foreground">Carrinho</h2>
            </div>

            {/* Itens do Carrinho */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Carrinho vazio
                </p>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-background rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          R$ {item.price.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        className="bg-muted hover:bg-muted/80 rounded px-2 py-1 text-sm"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.id, parseInt(e.target.value) || 0)
                        }
                        className="w-12 text-center bg-background border border-border rounded px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        className="bg-muted hover:bg-muted/80 rounded px-2 py-1 text-sm"
                      >
                        +
                      </button>
                      <div className="flex-1 text-right">
                        <p className="font-bold text-sm text-amber-600">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totais */}
            {cart.length > 0 && (
              <>
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-semibold">R$ {total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-amber-600">
                    <span>Total:</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Forma de Pagamento */}
                <div className="space-y-3 bg-muted/30 p-4 rounded-2xl border border-border/50">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <CreditCard className="w-3 h-3" /> Forma de Pagamento
                  </label>
                  <div className="space-y-3">
                    <select
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(
                          e.target.value as 'cash' | 'credit' | 'debit' | 'pix'
                        )
                      }
                      className="w-full bg-background border border-border rounded-xl px-4 h-12 text-sm font-bold shadow-sm"
                    >
                      <option value="cash">💵 Dinheiro (Sem Taxa)</option>
                      <option value="pix">📱 PIX (Sem Taxa)</option>
                      <option value="debit">🏦 Cartão de Débito</option>
                      <option value="credit">💳 Cartão de Crédito</option>
                    </select>

                    {paymentMethod === 'credit' && (
                      <div className="animate-in fade-in zoom-in-95 duration-200">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Parcelamento</Label>
                        <select
                          value={installments}
                          onChange={(e) => setInstallments(parseInt(e.target.value))}
                          className="w-full bg-background border border-border rounded-xl px-4 h-10 text-xs font-bold"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                            <option key={n} value={n}>{n}x {n === 1 ? 'à vista' : 'vezes'}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {netInfo.percent > 0 && (
                      <div className="flex items-center justify-between text-[10px] font-bold bg-primary/5 p-2 rounded-lg border border-primary/10 text-primary">
                        <span className="uppercase tracking-tighter">Taxa da Maquininha ({netInfo.percent}%):</span>
                        <span>- R$ {netInfo.fee.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-2xl space-y-1">
                  <p className="text-[10px] font-black uppercase text-green-600 dark:text-green-400">Recebimento Líquido Estimado</p>
                  <p className="text-2xl font-black text-green-600 dark:text-green-400">R$ {netInfo.net.toFixed(2)}</p>
                </div>

                {/* Botão Finalizar */}
                <Button
                  onClick={handleCheckout}
                  className="w-full gap-2 bg-green-600 hover:bg-green-700 rounded-full h-12 text-base font-bold"
                >
                  <DollarSign className="w-5 h-5" />
                  Finalizar Venda
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dialog Novo Produto */}
      <CreateProductDialog
        open={showCreateProduct}
        onOpenChange={setShowCreateProduct}
      />

      {/* Dialog Vincular Cliente */}
      <LinkCustomerDialog
        open={showLinkCustomer}
        onOpenChange={setShowLinkCustomer}
        onConfirm={handleCustomerLinked}
      />

      {/* Dialog Edição Rápida */}
      <Dialog open={showQuickEdit} onOpenChange={setShowQuickEdit}>
        <DialogContent className="flex flex-col w-[97vw] max-w-[97vw] max-h-[97vh] p-0 overflow-hidden border-none rounded-[32px] bg-background shadow-2xl">
          {/* Header Personalizado */}
          <div className="shrink-0 bg-amber-500/5 px-8 pt-8 pb-6 border-b border-amber-500/10 relative">
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-amber-500/20 p-3 rounded-2xl text-amber-600">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                  Edição Rápida
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium">
                  Altere as informações básicas do produto
                </DialogDescription>
              </div>
            </div>
          </div>

          {quickEditProduct && (
            <form onSubmit={handleQuickEditSave} className="flex-1 min-h-0 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {/* Escolha de Exibição */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Exibição</h3>
                </div>
                
                <Tabs 
                  value={quickEditProduct.activeMode} 
                  onValueChange={(v: any) => setQuickEditProduct({ ...quickEditProduct, activeMode: v })} 
                  className="w-full"
                >
                  <TabsList className="bg-muted/50 p-1 rounded-2xl border border-border/50 grid grid-cols-2 mb-4 h-12">
                    <TabsTrigger value="image" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold text-xs transition-all gap-2">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Foto
                    </TabsTrigger>
                    <TabsTrigger value="emoji" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold text-xs transition-all gap-2">
                      <Smile className="w-3.5 h-3.5" />
                      Emoji
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-0">
                    <TabsContent value="image" className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2">
                      <div className="space-y-4">
                        <ImageUploadField
                          onImageSelected={(file, result) => setQuickEditProductImage({ file, result })}
                          label="Trocar Foto"
                          maxSizeMB={50}
                        />
                        {(quickEditProduct.imageUrl || quickEditProduct.imageBase64) && !quickEditImage && (
                          <div className="relative group rounded-2xl overflow-hidden border border-border/50">
                            <img 
                              src={quickEditProduct.imageUrl || quickEditProduct.imageBase64} 
                              className="w-full h-32 object-cover opacity-60" 
                              alt="Atual"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[2px]">
                              <p className="text-[10px] font-black bg-background px-3 py-1 rounded-full border border-border shadow-sm">FOTO ATUAL</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="emoji" className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-4 bg-muted/20 p-4 rounded-[24px] border border-border/50">
                        <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-border/50">
                          {quickEditProduct.emoji}
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="edit-emoji" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                            Emoji / Ícone
                          </Label>
                          <Input
                            id="edit-emoji"
                            value={quickEditProduct.emoji}
                            onChange={(e) => setQuickEditProduct({ ...quickEditProduct, emoji: e.target.value })}
                            className="rounded-xl h-10 text-xl text-center bg-background border-border/50"
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome do Produto</Label>
                <div className="relative">
                  <Input
                    id="edit-name"
                    value={quickEditProduct.name}
                    onChange={(e) => setQuickEditProduct({ ...quickEditProduct, name: e.target.value })}
                    className="rounded-xl h-12 pl-10 font-bold bg-muted/30 focus:bg-background transition-all"
                    required
                  />
                  <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-price" className="text-[10px] font-black uppercase tracking-widest text-green-600 ml-1">Preço Venda (R$)</Label>
                  <div className="relative">
                    <Input
                      id="edit-price"
                      type="number"
                      step="0.01"
                      value={quickEditProduct.price}
                      onChange={(e) => setQuickEditProduct({ ...quickEditProduct, price: e.target.value })}
                      className="rounded-xl h-12 pl-8 font-black text-green-600 bg-green-500/5 border-green-500/10 focus:bg-background transition-all"
                      required
                    />
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-quantity" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Estoque</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    value={quickEditProduct.quantity}
                    onChange={(e) => setQuickEditProduct({ ...quickEditProduct, quantity: e.target.value })}
                    className="rounded-xl h-12 font-bold text-center bg-muted/30 focus:bg-background transition-all"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowQuickEdit(false)}
                  className="flex-1 rounded-2xl h-12 font-bold text-sm border-border/50"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl h-12 font-black text-sm shadow-lg shadow-amber-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {isSubmitting ? 'SALVANDO...' : 'SALVAR'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Cupom Fiscal */}
      {lastSaleData && (
        <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
          <DialogContent className="w-[97vw] max-w-[97vw] max-h-[97vh]">
            <DialogHeader>
              <DialogTitle>🧾 Cupom Fiscal</DialogTitle>
              <DialogDescription>
                Escolha o tamanho do cupom para impressão
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setReceiptFormat('58mm')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    receiptFormat === '58mm'
                      ? 'border-amber-600 bg-amber-50'
                      : 'border-border'
                  }`}
                >
                  <p className="font-bold text-sm">58mm</p>
                  <p className="text-xs text-muted-foreground">Compacto</p>
                </button>
                <button
                  onClick={() => setReceiptFormat('80mm')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    receiptFormat === '80mm'
                      ? 'border-amber-600 bg-amber-50'
                      : 'border-border'
                  }`}
                >
                  <p className="font-bold text-sm">80mm</p>
                  <p className="text-xs text-muted-foreground">Padrão</p>
                </button>
              </div>

              <ReceiptPrinter data={lastSaleData} format={receiptFormat} />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowReceipt(false);
                  setLastSaleData(null);
                }}
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </ResponsiveLayout>
  );
}
