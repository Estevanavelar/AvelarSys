import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, AlertTriangle } from "lucide-react";

export default function Inventory() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    salePrice: "",
    costPrice: "",
    minStock: 5,
    isContainer: false,
  });

  const { data: products, refetch } = trpc.products.list.useQuery();
  const createProductMutation = trpc.products.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProductMutation.mutateAsync(formData);
      setFormData({
        name: "",
        description: "",
        sku: "",
        salePrice: "",
        costPrice: "",
        minStock: 5,
        isContainer: false,
      });
      setShowForm(false);
      refetch();
      toast.success("Produto criado com sucesso!", { duration: 5000 });
    } catch (error) {
      toast.error("Erro ao criar produto", { duration: 5000 });
    }
  };

  const lowStockProducts = products?.filter((p) => {
    // Aqui você precisaria ter o estoque associado
    return false;
  }) || [];

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestão de Estoque</h1>
        <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700">
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
            </div>
          </div>
        </Card>
      )}

      {/* Formulário de Novo Produto */}
      {showForm && (
        <Card className="p-6 bg-blue-50">
          <h2 className="text-xl font-bold mb-4">Adicionar Novo Produto</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Nome do Produto *</label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: GLP 13Kg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">SKU</label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Ex: GLP-13"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Preço de Venda (R$) *</label>
              <Input
                required
                type="number"
                step="0.01"
                value={formData.salePrice}
                onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Preço de Custo (R$) *</label>
              <Input
                required
                type="number"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Estoque Mínimo</label>
              <Input
                type="number"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 5 })}
                placeholder="5"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isContainer"
                checked={formData.isContainer}
                onChange={(e) => setFormData({ ...formData, isContainer: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isContainer" className="text-sm font-semibold">
                É um vasilhame?
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2">Descrição</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tabela de Produtos */}
      <Card className="p-4">
        <h2 className="text-xl font-bold mb-4">Produtos Cadastrados</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Preço Venda</TableHead>
                <TableHead>Preço Custo</TableHead>
                <TableHead>Margem</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => {
                const margin = (
                  ((parseFloat(product.salePrice) - parseFloat(product.costPrice)) /
                    parseFloat(product.salePrice)) *
                  100
                ).toFixed(1);

                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-semibold">{product.name}</TableCell>
                    <TableCell>{product.sku || "-"}</TableCell>
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
    </div>
  );
}
