import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export default function Containers() {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("full");
  const [formData, setFormData] = useState({
    productId: "",
    customerId: "",
    status: "full",
    quantity: "1",
    notes: "",
  });

  // Dados mockados de vasilhames
  const containers = {
    full: [
      {
        id: 1,
        product: "GLP 13Kg",
        quantity: 45,
        location: "Depósito",
        lastUpdate: "2024-12-20",
        notes: "Pronto para venda",
      },
      {
        id: 2,
        product: "Água 20L",
        quantity: 120,
        location: "Depósito",
        lastUpdate: "2024-12-20",
        notes: "Estoque completo",
      },
    ],
    empty: [
      {
        id: 3,
        product: "GLP 13Kg",
        quantity: 12,
        location: "Depósito",
        lastUpdate: "2024-12-19",
        notes: "Aguardando reabastecimento",
      },
      {
        id: 4,
        product: "Água 20L",
        quantity: 8,
        location: "Depósito",
        lastUpdate: "2024-12-18",
        notes: "Para limpeza",
      },
    ],
    customer: [
      {
        id: 5,
        product: "GLP 13Kg",
        customer: "João Silva",
        quantity: 3,
        deliveryDate: "2024-12-15",
        expectedReturn: "2025-01-15",
        status: "pending",
        notes: "Cliente residencial",
      },
      {
        id: 6,
        product: "Água 20L",
        customer: "Maria Santos",
        quantity: 5,
        deliveryDate: "2024-12-10",
        expectedReturn: "2025-01-10",
        status: "overdue",
        notes: "Devolução vencida",
      },
      {
        id: 7,
        product: "GLP 13Kg",
        customer: "Pedro Oliveira",
        quantity: 2,
        deliveryDate: "2024-12-18",
        expectedReturn: "2025-01-18",
        status: "pending",
        notes: "Cliente comercial",
      },
    ],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Vasilhame registrado com sucesso!", { duration: 5000 });
    setFormData({
      productId: "",
      customerId: "",
      status: "full",
      quantity: "1",
      notes: "",
    });
    setShowForm(false);
  };

  const stats = {
    totalFull: containers.full.reduce((sum, c) => sum + c.quantity, 0),
    totalEmpty: containers.empty.reduce((sum, c) => sum + c.quantity, 0),
    totalWithCustomers: containers.customer.reduce((sum, c) => sum + c.quantity, 0),
    overdue: containers.customer.filter((c) => c.status === "overdue").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs flex items-center gap-1"><Clock size={14} /> Pendente</span>;
      case "overdue":
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs flex items-center gap-1"><AlertTriangle size={14} /> Vencido</span>;
      case "returned":
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs flex items-center gap-1"><CheckCircle size={14} /> Devolvido</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Controle de Vasilhames</h1>
        <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700">
          <Plus size={20} className="mr-2" />
          Registrar Vasilhame
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="text-sm text-gray-600 mb-1">Vasilhames Cheios</div>
          <div className="text-2xl font-bold text-green-600">{stats.totalFull}</div>
          <div className="text-xs text-gray-500 mt-2">Pronto para venda</div>
        </Card>

        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="text-sm text-gray-600 mb-1">Vasilhames Vazios</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.totalEmpty}</div>
          <div className="text-xs text-gray-500 mt-2">Aguardando reabastecimento</div>
        </Card>

        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="text-sm text-gray-600 mb-1">Em Posse de Clientes</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalWithCustomers}</div>
          <div className="text-xs text-gray-500 mt-2">Aguardando devolução</div>
        </Card>

        <Card className="p-4 bg-red-50 border-red-200">
          <div className="text-sm text-gray-600 mb-1">Devoluções Vencidas</div>
          <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          <div className="text-xs text-gray-500 mt-2">Ação necessária</div>
        </Card>
      </div>

      {/* Alertas */}
      {stats.overdue > 0 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 mt-1" size={20} />
            <div>
              <h3 className="font-semibold text-red-800">Devoluções Vencidas</h3>
              <p className="text-sm text-red-700">
                {stats.overdue} vasilhame(s) com devolução vencida. Contate os clientes para devolução imediata.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Formulário */}
      {showForm && (
        <Card className="p-6 bg-blue-50">
          <h2 className="text-xl font-bold mb-4">Registrar Vasilhame</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Produto *</label>
              <Select value={formData.productId} onValueChange={(v) => setFormData({ ...formData, productId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar produto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="glp13">GLP 13Kg</SelectItem>
                  <SelectItem value="agua20">Água 20L</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Status *</label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Cheio</SelectItem>
                  <SelectItem value="empty">Vazio</SelectItem>
                  <SelectItem value="customer">Em Posse de Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Quantidade *</label>
              <Input
                required
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="1"
                min="1"
              />
            </div>

            {formData.status === "customer" && (
              <div>
                <label className="block text-sm font-semibold mb-2">Cliente</label>
                <Select value={formData.customerId} onValueChange={(v) => setFormData({ ...formData, customerId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="joao">João Silva</SelectItem>
                    <SelectItem value="maria">Maria Santos</SelectItem>
                    <SelectItem value="pedro">Pedro Oliveira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2">Observações</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionais"
              />
            </div>

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                Registrar
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

      {/* Abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="full">Cheios ({stats.totalFull})</TabsTrigger>
          <TabsTrigger value="empty">Vazios ({stats.totalEmpty})</TabsTrigger>
          <TabsTrigger value="customer">Com Clientes ({stats.totalWithCustomers})</TabsTrigger>
        </TabsList>

        {/* Vasilhames Cheios */}
        <TabsContent value="full" className="space-y-4">
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Vasilhames Cheios - Pronto para Venda</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Última Atualização</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {containers.full.map((container) => (
                    <TableRow key={container.id}>
                      <TableCell className="font-semibold">{container.product}</TableCell>
                      <TableCell>{container.quantity}</TableCell>
                      <TableCell>{container.location}</TableCell>
                      <TableCell>{new Date(container.lastUpdate).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{container.notes}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Vasilhames Vazios */}
        <TabsContent value="empty" className="space-y-4">
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Vasilhames Vazios - Aguardando Reabastecimento</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Última Atualização</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {containers.empty.map((container) => (
                    <TableRow key={container.id}>
                      <TableCell className="font-semibold">{container.product}</TableCell>
                      <TableCell>{container.quantity}</TableCell>
                      <TableCell>{container.location}</TableCell>
                      <TableCell>{new Date(container.lastUpdate).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{container.notes}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Vasilhames com Clientes */}
        <TabsContent value="customer" className="space-y-4">
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Vasilhames em Posse de Clientes</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Data Entrega</TableHead>
                    <TableHead>Devolução Esperada</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {containers.customer.map((container) => (
                    <TableRow key={container.id} className={container.status === "overdue" ? "bg-red-50" : ""}>
                      <TableCell className="font-semibold">{container.product}</TableCell>
                      <TableCell>{container.customer}</TableCell>
                      <TableCell>{container.quantity}</TableCell>
                      <TableCell>{new Date(container.deliveryDate).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{new Date(container.expectedReturn).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{getStatusBadge(container.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            Registrar Devolução
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
