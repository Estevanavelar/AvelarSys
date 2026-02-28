import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  X, Plus, ImageIcon, Smile, RefreshCw, Package, 
  Tag, Barcode, DollarSign, Wallet, Layers, 
  AlertCircle, Info, ChevronRight, Check
} from 'lucide-react';
import ImageUploadField from './ImageUploadField';
import { useProducts } from '@/contexts/ProductsContext';
import { uploadImageFile } from '@/lib/storage';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories?: string[];
}

export default function CreateProductDialog({
  open,
  onOpenChange,
  categories,
}: CreateProductDialogProps) {
  const [activeMode, setActiveMode] = useState<'image' | 'emoji'>('image');
  const { addProduct } = useProducts();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    unit: 'unidade',
    price: '',
    cost: '',
    quantity: '',
    minStock: '',
    maxStock: '',
    category: '',
    emoji: '📦',
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [compressionResult, setCompressionResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateSKU = () => {
    return Math.floor(100000000 + Math.random() * 900000000).toString();
  };

  useEffect(() => {
    if (open && !formData.sku) {
      setFormData(prev => ({ ...prev, sku: generateSKU() }));
    }
  }, [open]);

  const defaultCategories = [
    'Acessórios',
    'Carregadores',
    'Capas e Películas',
    'Baterias',
    'Cabos',
    'Fones',
    'Suportes',
    'Outros',
  ];
  const categoryList = categories || defaultCategories;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.currentTarget;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageSelected = (file: File, result: any) => {
    setSelectedImage(file);
    setCompressionResult(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.sku || !formData.price) {
      alert('Preencha os campos obrigatórios: nome, SKU e preço');
      return;
    }

    if (activeMode === 'image' && !selectedImage) {
      alert('Selecione uma imagem ou use o modo Emoji');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = undefined;
      
      if (activeMode === 'image' && compressionResult?.file) {
        imageUrl = await uploadImageFile(compressionResult.file);
      }

      await addProduct({
        name: formData.name,
        description: formData.description || undefined,
        sku: formData.sku,
        barcode: formData.barcode || undefined,
        unit: formData.unit,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        quantity: parseInt(formData.quantity) || 0,
        minStock: parseInt(formData.minStock) || 0,
        maxStock: formData.maxStock ? parseInt(formData.maxStock) : undefined,
        category: formData.category || undefined,
        imageUrl: activeMode === 'image' ? imageUrl : undefined,
        emojiIcon: activeMode === 'emoji' ? formData.emoji : undefined,
        active: true,
      });

      // Limpar formulário
      setFormData({
        name: '',
        description: '',
        sku: '',
        barcode: '',
        unit: 'unidade',
        price: '',
        cost: '',
        quantity: '',
        minStock: '',
        maxStock: '',
        category: '',
        emoji: '📦',
      });
      setSelectedImage(null);
      setCompressionResult(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao enviar imagem para o S3:', error);
      alert('Falha ao processar o produto. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[97vw] max-w-[97vw] max-h-[97vh] p-0 overflow-hidden border-none rounded-[32px] bg-background shadow-2xl">
        {/* Header Personalizado */}
        <div className="bg-primary/5 px-8 pt-8 pb-6 border-b border-primary/10 relative">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-primary/20 p-3 rounded-2xl text-primary">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                Novo Produto
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium">
                Cadastre um novo item no seu inventário
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* SEÇÃO: APARÊNCIA */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Exibição do Produto</h3>
            </div>
            
            <Tabs value={activeMode} onValueChange={(v: any) => setActiveMode(v)} className="w-full">
              <TabsList className="bg-muted/50 p-1 rounded-2xl border border-border/50 grid grid-cols-2 mb-4 h-14">
                <TabsTrigger 
                  value="image" 
                  className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold text-sm transition-all gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Foto Real
                </TabsTrigger>
                <TabsTrigger 
                  value="emoji" 
                  className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold text-sm transition-all gap-2"
                >
                  <Smile className="w-4 h-4" />
                  Emoji/Ícone
                </TabsTrigger>
              </TabsList>

              <TabsContent value="image" className="mt-0 animate-in fade-in slide-in-from-bottom-2">
                <ImageUploadField
                  onImageSelected={handleImageSelected}
                  label="Arraste a foto ou clique para selecionar"
                  maxSizeMB={50}
                />
              </TabsContent>

              <TabsContent value="emoji" className="mt-0 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-6 bg-muted/20 p-6 rounded-[24px] border border-border/50">
                  <div className="w-24 h-24 bg-background rounded-3xl flex items-center justify-center text-5xl shadow-sm border border-border/50">
                    {formData.emoji}
                  </div>
                  <div className="flex-1 space-y-3">
                    <Label htmlFor="emoji" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      Escolha um Emoji
                    </Label>
                    <Input
                      id="emoji"
                      name="emoji"
                      placeholder="📦"
                      value={formData.emoji}
                      onChange={handleInputChange}
                      className="rounded-xl h-12 text-2xl text-center bg-background border-border/50"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <Separator className="opacity-50" />

          {/* SEÇÃO: INFORMAÇÕES BÁSICAS */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Informações Principais</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Nome do Produto *
              </Label>
              <div className="relative">
                <Input
                  id="name"
                  name="name"
                  placeholder="Ex: iPhone 14 Pro Max 256GB"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="rounded-xl h-14 pl-12 text-lg font-bold bg-muted/30 focus:bg-background transition-all"
                  required
                />
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Descrição
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Ex: Produto original, garantia de 90 dias, acompanha nota fiscal"
                value={formData.description}
                onChange={handleInputChange}
                className="rounded-xl min-h-[110px] bg-muted/30 focus:bg-background transition-all text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="sku" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex justify-between items-center">
                  SKU (Código Interno)
                  <button 
                    type="button" 
                    onClick={() => setFormData(prev => ({ ...prev, sku: generateSKU() }))}
                    className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary/20 transition-all flex items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> GERAR NOVO
                  </button>
                </Label>
                <div className="relative">
                  <Input
                    id="sku"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    className="rounded-xl h-14 pl-12 font-mono text-base bg-muted/30 focus:bg-background transition-all"
                    required
                  />
                  <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Categoria
                </Label>
                <div className="relative">
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full h-14 pl-12 pr-4 border border-border rounded-xl bg-muted/30 focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold appearance-none"
                  >
                    <option value="">Selecione...</option>
                    {categoryList.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rotate-90" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="barcode" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Código de Barras
                </Label>
                <div className="relative">
                  <Input
                    id="barcode"
                    name="barcode"
                    placeholder="Ex: 7890000000000"
                    value={formData.barcode}
                    onChange={handleInputChange}
                    className="rounded-xl h-14 pl-12 font-mono text-base bg-muted/30 focus:bg-background transition-all"
                    inputMode="numeric"
                  />
                  <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Unidade de Medida
                </Label>
                <div className="relative">
                  <select
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                    className="w-full h-14 pl-12 pr-4 border border-border rounded-xl bg-muted/30 focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold appearance-none"
                  >
                    <option value="unidade">Unidade</option>
                    <option value="kg">Kg</option>
                    <option value="g">G</option>
                    <option value="ml">Ml</option>
                    <option value="l">L</option>
                    <option value="m">M</option>
                    <option value="m2">M²</option>
                    <option value="m3">M³</option>
                  </select>
                  <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rotate-90" />
                </div>
              </div>
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* SEÇÃO: PRECIFICAÇÃO E ESTOQUE */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Financeiro e Estoque</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-[10px] font-black uppercase tracking-widest text-green-600 ml-1">
                  Preço de Venda (R$) *
                </Label>
                <div className="relative">
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="rounded-xl h-14 pl-12 text-xl font-black text-green-600 bg-green-500/5 focus:bg-background border-green-500/20 transition-all"
                    required
                  />
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost" className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">
                  Preço de Custo (R$)
                </Label>
                <div className="relative">
                  <Input
                    id="cost"
                    name="cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.cost}
                    onChange={handleInputChange}
                    className="rounded-xl h-14 pl-12 text-xl font-black text-blue-600 bg-blue-500/5 focus:bg-background border-blue-500/20 transition-all"
                  />
                  <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Quantidade Inicial
                </Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    placeholder="Ex: 10"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className="rounded-xl h-14 font-bold text-center text-lg bg-muted/30 focus:bg-background transition-all"
                  />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock" className="text-[10px] font-black uppercase tracking-widest text-destructive ml-1">
                  Estoque Mínimo (Alerta)
                </Label>
                <Input
                  id="minStock"
                  name="minStock"
                  type="number"
                  placeholder="Ex: 2"
                  value={formData.minStock}
                  onChange={handleInputChange}
                  className="rounded-xl h-14 font-bold text-center text-lg bg-destructive/5 border-destructive/10 focus:bg-background transition-all text-destructive"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxStock" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Estoque Máximo
                </Label>
                <Input
                  id="maxStock"
                  name="maxStock"
                  type="number"
                  placeholder="Ex: 50"
                  value={formData.maxStock}
                  onChange={handleInputChange}
                  className="rounded-xl h-14 font-bold text-center text-lg bg-muted/30 focus:bg-background transition-all"
                />
              </div>
            </div>
          </div>

          {/* Compression Info */}
          {compressionResult && (
            <div className="bg-primary/5 border border-primary/10 rounded-[24px] p-6 text-sm animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-primary" />
                <p className="font-black uppercase tracking-tighter text-primary">Info da Imagem</p>
              </div>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
                <div className="flex justify-between border-b border-primary/10 pb-1">
                  <span className="text-muted-foreground">Original:</span>
                  <span className="font-bold">{compressionResult.originalSizeKB}</span>
                </div>
                <div className="flex justify-between border-b border-primary/10 pb-1">
                  <span className="text-muted-foreground">Reduzido:</span>
                  <span className="font-bold text-green-600">{compressionResult.compressedSizeKB}</span>
                </div>
                <div className="flex justify-between border-b border-primary/10 pb-1">
                  <span className="text-muted-foreground">Redução:</span>
                  <span className="font-bold text-primary">{compressionResult.compressionRatio}%</span>
                </div>
                <div className="flex justify-between border-b border-primary/10 pb-1">
                  <span className="text-muted-foreground">Formato:</span>
                  <span className="font-bold uppercase">{compressionResult.format}</span>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer com Ações */}
        <div className="p-8 border-t bg-muted/20 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-2xl h-14 font-bold text-base transition-all active:scale-95 border-border/50 hover:bg-background"
          >
            Cancelar
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(e as any);
            }}
            disabled={isSubmitting}
            className="flex-[2] gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl h-14 font-black text-lg shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            {isSubmitting ? 'SALVANDO...' : 'CADASTRAR PRODUTO'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
