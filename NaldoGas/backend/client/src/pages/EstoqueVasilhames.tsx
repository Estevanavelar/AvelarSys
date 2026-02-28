import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, AlertTriangle, Package, Layers } from "lucide-react";

export default function EstoqueVasilhames() {
  const [mainTab, setMainTab] = useState("produtos");
  const [vasilhameTab, setVasilhameTab] = useState("full");
  const [showProductForm, setShowProductForm] = useState(false);
  const [productFormData, setProductFormData] = useState({
    name: "",
    description: "",
    sku: "",
    salePrice: "",
    costPrice: "",
    minStock: 5,
    isContainer: false,
  });

  const { data: products, refetch: refetchProducts } = trpc.products.list.useQuery();
  const { data: inventory } = trpc.inventory.list.useQuery();
  const { data: containers } = trpc.containers.list.useQuery();
  const createProductMutation = trpc.products.create.useMutation();

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProductMutation.mutateAsync(productFormData);
      setProductFormData({
        name: "",
        description: "",
        sku: "",
        salePrice: "",
        costPrice: "",
        minStock: 5,
        isContainer: false,
      });
      setShowProductForm(false);
      refetchProducts();
      toast.success("Produto criado com sucesso!", { duration: 5000 });
    } catch (error) {
      toast.error("Erro ao criar produto", { duration: 5000 });
    }
  };

  // Combinar produtos com estoque
  const productsWithStock = products?.map((product) => {
    const stock = inventory?.find((inv: any) => inv.productId === product.id);
    return {
      ...product,
      stockQuantity: stock?.quantity || 0,
      isLowStock: (stock?.quantity || 0) < (product.minStock || 5),
    };
  }) || [];

  const lowStockProducts = productsWithStock.filter((p) => p.isLowStock);

  // Agrupar vasilhames por status
  const fullContainers = containers?.filter((c: any) => c.status === "full") || [];
  const emptyContainers = containers?.filter((c: any) => c.status === "empty") || [];
  const customerContainers = containers?.filter((c: any) => c.status === "customer_possession") || [];

  // Calcular totais de vasilhames
  const totalFull = fullContainers.reduce((sum: number, c: any) => sum + (c.quantity || 0), 0);
  const totalEmpty = emptyContainers.reduce((sum: number, c: any) => sum + (c.quantity || 0), 0);
  const totalCustomer = customerContainers.reduce((sum: number, c: any) => sum + (c.quantity || 0), 0);

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Estoque & Vasilhames</h1>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="produtos" className="flex items-center gap-2">
            <Package size={18} />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="vasilhames" className="flex items-center gap-2">
            <Layers size={18} />
            Vasilhames
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: PRODUTOS (ESTOQUE) */}
        <TabsContent value="produtos" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Gestão de Produtos</h2>
            <Button
              onClick={() => setShowProductForm(!showProductForm)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus size={20} className="mr-2" />
              Novo Produto
            </Button>
          </div>

          {/* Alertas de Estoque Baixo */}
          {lowStockProducts.length > 0 && (
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-600 mt-1" size={20} />
                <div>
                  <h3 className="font-semibold text-yellow-800">Produtos com Estoque Baixo</h3>
                  <p className="text-sm text-yellow-700">
                    {lowStockProducts.length} produto(s) precisam de reabastecimento
                  </p>
                  <ul className="mt-2 text-sm text-yellow-700">
                    {lowStockProducts.map((p) => (
                      <li key={p.id}>
                        • {p.name}: {p.stockQuantity} unidades (mínimo: {p.minStock})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Formulário de Novo Produto */}
          {showProductForm && (
            <Card className="p-6 bg-blue-50">
              <h3 className="text-xl font-bold mb-4">Adicionar Novo Produto</h3>
              <form onSubmit={handleProductSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Nome do Produto *</label>
                  <Input
                    required
                    value={productFormData.name}
                    onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                    placeholder="Ex: GLP 13Kg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">SKU</label>
                  <Input
                    value={productFormData.sku}
                    onChange={(e) => setProductFormData({ ...productFormData, sku: e.target.value })}
                    placeholder="Ex: GLP-13"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Preço de Venda (R$) *</label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    value={productFormData.salePrice}
                    onChange={(e) => setProductFormData({ ...productFormData, salePrice: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Preço de Custo (R$) *</label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    value={productFormData.costPrice}
                    onChange={(e) => setProductFormData({ ...productFormData, costPrice: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Estoque Mínimo</label>
                  <Input
                    type="number"
                    value={productFormData.minStock}
                    onChange={(e) =>
                      setProductFormData({ ...productFormData, minStock: parseInt(e.target.value) || 5 })
                    }
                    placeholder="5"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isContainer"
                    checked={productFormData.isContainer}
                    onChange={(e) => setProductFormData({ ...productFormData, isContainer: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isContainer" className="text-sm font-semibold">
                    É um vasilhame?
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Descrição</label>
                  <Input
                    value={productFormData.description}
                    onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                    placeholder="Descrição do produto"
                  />
                </div>

                <div className="md:col-span-2 flex gap-2">
                  <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                    Salvar Produto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowProductForm(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Tabela de Produtos com Estoque */}
          <Card className="p-4">
            <h3 className="text-xl font-bold mb-4">Produtos Cadastrados</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Estoque Atual</TableHead>
                    <TableHead>Estoque Mínimo</TableHead>
                    <TableHead>Preço Venda</TableHead>
                    <TableHead>Preço Custo</TableHead>
                    <TableHead>Margem</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsWithStock.map((product) => {
                    const margin = (
                      ((parseFloat(product.salePrice) - parseFloat(product.costPrice)) /
                        parseFloat(product.salePrice)) *
                      100
                    ).toFixed(1);

                    return (
                      <TableRow key={product.id} className={product.isLowStock ? "bg-yellow-50" : ""}>
                        <TableCell className="font-semibold">
                          {product.name}
                          {product.isLowStock && (
                            <AlertTriangle size={16} className="inline ml-2 text-yellow-600" />
                          )}
                        </TableCell>
                        <TableCell>{product.sku || "-"}</TableCell>
                        <TableCell>
                          <span
                            className={`font-semibold ${
                              product.isLowStock ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {product.stockQuantity}
                          </span>
                        </TableCell>
                        <TableCell>{product.minStock}</TableCell>
                        <TableCell>R$ {parseFloat(product.salePrice).toFixed(2)}</TableCell>
                        <TableCell>R$ {parseFloat(product.costPrice).toFixed(2)}</TableCell>
                        <TableCell className="text-green-600 font-semibold">{margin}%</TableCell>
                        <TableCell>
                          {product.isContainer ? (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                              Vasilhame
                            </span>
                          ) : (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              Produto
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Edit2 size={16} />
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600">
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ABA 2: VASILHAMES */}
        <TabsContent value="vasilhames" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Controle de Vasilhames</h2>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-green-700 font-semibold">Vasilhames Cheios</p>
                  <p className="text-3xl font-bold text-green-800 mt-2">{totalFull}</p>
                  <p className="text-xs text-green-600 mt-1">Prontos para venda</p>
                </div>
                <div className="bg-green-200 p-2 rounded">
                  <Package size={24} className="text-green-700" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-blue-700 font-semibold">Vasilhames Vazios</p>
                  <p className="text-3xl font-bold text-blue-800 mt-2">{totalEmpty}</p>
                  <p className="text-xs text-blue-600 mt-1">Para reabastecimento</p>
                </div>
                <div className="bg-blue-200 p-2 rounded">
                  <Package size={24} className="text-blue-700" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-orange-50 border-orange-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-orange-700 font-semibold">Em Posse de Clientes</p>
                  <p className="text-3xl font-bold text-orange-800 mt-2">{totalCustomer}</p>
                  <p className="text-xs text-orange-600 mt-1">Aguardando devolução</p>
                </div>
                <div className="bg-orange-200 p-2 rounded">
                  <AlertTriangle size={24} className="text-orange-700" />
                </div>
              </div>
            </Card>
          </div>

          {/* Sub-abas de Vasilhames */}
          <Card className="p-4">
            <Tabs value={vasilhameTab} onValueChange={setVasilhameTab}>
              <TabsList className="grid w-full max-w-lg grid-cols-3">
                <TabsTrigger value="full">Cheios ({totalFull})</TabsTrigger>
                <TabsTrigger value="empty">Vazios ({totalEmpty})</TabsTrigger>
                <TabsTrigger value="customer">Em Clientes ({totalCustomer})</TabsTrigger>
              </TabsList>

              {/* Vasilhames Cheios */}
              <TabsContent value="full" className="mt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Última Atualização</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fullContainers.map((container: any) => {
                        const product = products?.find((p) => p.id === container.productId);
                        return (
                          <TableRow key={container.id}>
                            <TableCell className="font-semibold">{product?.name || "N/A"}</TableCell>
                            <TableCell>
                              <span className="text-green-600 font-bold">{container.quantity}</span>
                            </TableCell>
                            <TableCell>
                              {new Date(container.updatedAt).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline">
                                <Edit2 size={16} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {fullContainers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                            Nenhum vasilhame cheio registrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Vasilhames Vazios */}
              <TabsContent value="empty" className="mt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Última Atualização</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emptyContainers.map((container: any) => {
                        const product = products?.find((p) => p.id === container.productId);
                        return (
                          <TableRow key={container.id}>
                            <TableCell className="font-semibold">{product?.name || "N/A"}</TableCell>
                            <TableCell>
                              <span className="text-blue-600 font-bold">{container.quantity}</span>
                            </TableCell>
                            <TableCell>
                              {new Date(container.updatedAt).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline">
                                <Edit2 size={16} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {emptyContainers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                            Nenhum vasilhame vazio registrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Vasilhames em Posse de Clientes */}
              <TabsContent value="customer" className="mt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Última Atualização</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerContainers.map((container: any) => {
                        const product = products?.find((p) => p.id === container.productId);
                        return (
                          <TableRow key={container.id}>
                            <TableCell className="font-semibold">{product?.name || "N/A"}</TableCell>
                            <TableCell>Cliente ID: {container.customerId || "N/A"}</TableCell>
                            <TableCell>
                              <span className="text-orange-600 font-bold">{container.quantity}</span>
                            </TableCell>
                            <TableCell>
                              {new Date(container.updatedAt).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline">
                                <Edit2 size={16} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {customerContainers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                            Nenhum vasilhame em posse de clientes
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
