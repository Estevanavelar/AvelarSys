import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function Employees() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "vendor",
    status: "active",
  });

  // Dados mockados de funcionários
  const employees = [
    {
      id: 1,
      name: "João Silva",
      email: "joao@naldogas.com",
      phone: "(11) 99999-1111",
      role: "admin",
      status: "active",
      joinDate: "2023-01-15",
      sales: 45,
      revenue: 15000,
    },
    {
      id: 2,
      name: "Maria Santos",
      email: "maria@naldogas.com",
      phone: "(11) 99999-2222",
      role: "vendor",
      status: "active",
      joinDate: "2023-03-20",
      sales: 38,
      revenue: 12000,
    },
    {
      id: 3,
      name: "Pedro Oliveira",
      email: "pedro@naldogas.com",
      phone: "(11) 99999-3333",
      role: "deliverer",
      status: "active",
      joinDate: "2023-05-10",
      sales: 0,
      revenue: 0,
    },
    {
      id: 4,
      name: "Ana Costa",
      email: "ana@naldogas.com",
      phone: "(11) 99999-4444",
      role: "vendor",
      status: "inactive",
      joinDate: "2023-02-01",
      sales: 32,
      revenue: 10000,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Funcionário criado com sucesso!", { duration: 5000 });
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "vendor",
      status: "active",
    });
    setShowForm(false);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Administrador</span>;
      case "vendor":
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Vendedor</span>;
      case "deliverer":
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Entregador</span>;
      default:
        return <span>{role}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Ativo</span>
    ) : (
      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">Inativo</span>
    );
  };

  const activeCount = employees.filter((e) => e.status === "active").length;
  const totalSales = employees.reduce((sum, e) => sum + e.sales, 0);
  const topVendor = employees.filter((e) => e.role === "vendor").sort((a, b) => b.revenue - a.revenue)[0];

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestão de Funcionários</h1>
        <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700">
          <Plus size={20} className="mr-2" />
          Novo Funcionário
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Funcionários Ativos</div>
              <div className="text-2xl font-bold text-blue-600">{activeCount}</div>
            </div>
            <Users className="text-blue-600" size={24} />
          </div>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Total de Vendas</div>
              <div className="text-2xl font-bold text-green-600">{totalSales}</div>
            </div>
            <TrendingUp className="text-green-600" size={24} />
          </div>
        </Card>

        <Card className="p-4 bg-purple-50 border-purple-200">
          <div>
            <div className="text-sm text-gray-600 mb-1">Melhor Vendedor</div>
            <div className="text-lg font-bold text-purple-600">{topVendor?.name || "N/A"}</div>
            <div className="text-xs text-gray-500 mt-1">R$ {topVendor?.revenue.toLocaleString("pt-BR") || "0"}</div>
          </div>
        </Card>
      </div>

      {/* Formulário de Novo Funcionário */}
      {showForm && (
        <Card className="p-6 bg-blue-50">
          <h2 className="text-xl font-bold mb-4">Adicionar Novo Funcionário</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Nome *</label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Email *</label>
              <Input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@naldogas.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Telefone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Cargo *</label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="vendor">Vendedor</SelectItem>
                  <SelectItem value="deliverer">Entregador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Status</label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                Salvar Funcionário
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

      {/* Tabela de Funcionários */}
      <Card className="p-4">
        <h2 className="text-xl font-bold mb-4">Funcionários Cadastrados</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vendas</TableHead>
                <TableHead>Receita</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-semibold">{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.phone}</TableCell>
                  <TableCell>{getRoleBadge(employee.role)}</TableCell>
                  <TableCell>{getStatusBadge(employee.status)}</TableCell>
                  <TableCell>{employee.sales}</TableCell>
                  <TableCell className="text-green-600 font-semibold">
                    R$ {employee.revenue.toLocaleString("pt-BR")}
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
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Desempenho por Vendedor */}
      <Card className="p-4">
        <h2 className="text-xl font-bold mb-4">Desempenho de Vendedores</h2>
        <div className="space-y-3">
          {employees
            .filter((e) => e.role === "vendor")
            .sort((a, b) => b.revenue - a.revenue)
            .map((employee, idx) => (
              <div key={employee.id} className="flex items-center justify-between pb-3 border-b last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-semibold">{employee.name}</div>
                    <div className="text-xs text-gray-500">{employee.sales} vendas</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">R$ {employee.revenue.toLocaleString("pt-BR")}</div>
                  <div className="text-xs text-gray-500">
                    Média: R$ {(employee.revenue / employee.sales).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}
