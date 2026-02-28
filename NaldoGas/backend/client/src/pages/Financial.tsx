import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Financial() {
  const [showPayableForm, setShowPayableForm] = useState(false);
  const [payableForm, setPayableForm] = useState({
    description: "",
    amount: "",
    category: "",
    dueDate: "",
  });

  const { data: receivables } = trpc.financial.receivables.list.useQuery();
  const { data: payables } = trpc.financial.payables.list.useQuery();
  const createPayableMutation = trpc.financial.payables.create.useMutation();

  const handleCreatePayable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPayableMutation.mutateAsync({
        description: payableForm.description,
        amount: payableForm.amount,
        category: payableForm.category,
        dueDate: new Date(payableForm.dueDate),
      });
      setPayableForm({
        description: "",
        amount: "",
        category: "",
        dueDate: "",
      });
      setShowPayableForm(false);
      toast.success("Conta a pagar criada com sucesso!", { duration: 5000 });
    } catch (error) {
      toast.error("Erro ao criar conta a pagar", { duration: 5000 });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs flex items-center gap-1"><CheckCircle size={14} /> Pago</span>;
      case "pending":
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs flex items-center gap-1"><Clock size={14} /> Pendente</span>;
      case "overdue":
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs flex items-center gap-1"><AlertCircle size={14} /> Vencido</span>;
      case "partial":
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Parcial</span>;
      default:
        return <span>{status}</span>;
    }
  };

  const totalReceivables = receivables?.reduce((sum, r) => sum + parseFloat(r.totalAmount || "0"), 0) || 0;
  const totalPaidReceivables = receivables?.reduce((sum, r) => sum + parseFloat(r.paidAmount || "0"), 0) || 0;
  const totalPayables = payables?.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0) || 0;
  const totalPaidPayables = payables?.filter(p => p.status === "paid").reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0) || 0;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold">Módulo Financeiro</h1>

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="text-sm text-gray-600 mb-1">Contas a Receber</div>
          <div className="text-2xl font-bold text-blue-600">R$ {totalReceivables.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-2">Recebido: R$ {totalPaidReceivables.toFixed(2)}</div>
        </Card>

        <Card className="p-4 bg-red-50 border-red-200">
          <div className="text-sm text-gray-600 mb-1">Contas a Pagar</div>
          <div className="text-2xl font-bold text-red-600">R$ {(totalPayables - totalPaidPayables).toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-2">Total: R$ {totalPayables.toFixed(2)}</div>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="text-sm text-gray-600 mb-1">Saldo Líquido</div>
          <div className="text-2xl font-bold text-green-600">
            R$ {(totalReceivables - totalPayables).toFixed(2)}
          </div>
        </Card>

        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="text-sm text-gray-600 mb-1">Fiados Pendentes</div>
          <div className="text-2xl font-bold text-purple-600">
            {receivables?.filter(r => r.status === "pending" || r.status === "partial").length || 0}
          </div>
        </Card>
      </div>

      {/* Abas */}
      <Tabs defaultValue="receivables" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="receivables">Contas a Receber (Fiados)</TabsTrigger>
          <TabsTrigger value="payables">Contas a Pagar</TabsTrigger>
        </TabsList>

        {/* Contas a Receber */}
        <TabsContent value="receivables" className="space-y-4">
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Fiados Pendentes</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Recebido</TableHead>
                    <TableHead>Pendente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables?.map((receivable: any) => (
                    <TableRow key={receivable.id}>
                      <TableCell className="font-semibold">{receivable.customer?.name || "N/A"}</TableCell>
                      <TableCell>R$ {parseFloat(receivable.totalAmount).toFixed(2)}</TableCell>
                      <TableCell className="text-green-600">R$ {parseFloat(receivable.paidAmount).toFixed(2)}</TableCell>
                      <TableCell className="text-red-600">
                        R$ {(parseFloat(receivable.totalAmount) - parseFloat(receivable.paidAmount)).toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(receivable.status)}</TableCell>
                      <TableCell>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          Receber
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Contas a Pagar */}
        <TabsContent value="payables" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowPayableForm(!showPayableForm)} className="bg-blue-600 hover:bg-blue-700">
              <Plus size={20} className="mr-2" />
              Nova Despesa
            </Button>
          </div>

          {/* Formulário de Nova Despesa */}
          {showPayableForm && (
            <Card className="p-6 bg-blue-50">
              <h2 className="text-xl font-bold mb-4">Adicionar Despesa</h2>
              <form onSubmit={handleCreatePayable} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Descrição *</label>
                  <Input
                    required
                    value={payableForm.description}
                    onChange={(e) => setPayableForm({ ...payableForm, description: e.target.value })}
                    placeholder="Ex: Aluguel do depósito"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Valor (R$) *</label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    value={payableForm.amount}
                    onChange={(e) => setPayableForm({ ...payableForm, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Categoria</label>
                  <Input
                    value={payableForm.category}
                    onChange={(e) => setPayableForm({ ...payableForm, category: e.target.value })}
                    placeholder="Ex: Aluguel, Salário"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Data de Vencimento *</label>
                  <Input
                    required
                    type="date"
                    value={payableForm.dueDate}
                    onChange={(e) => setPayableForm({ ...payableForm, dueDate: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2 flex gap-2">
                  <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                    Salvar Despesa
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPayableForm(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Tabela de Despesas */}
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Despesas</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payables?.map((payable: any) => (
                    <TableRow key={payable.id}>
                      <TableCell className="font-semibold">{payable.description}</TableCell>
                      <TableCell>{payable.category || "-"}</TableCell>
                      <TableCell>R$ {parseFloat(payable.amount).toFixed(2)}</TableCell>
                      <TableCell>{new Date(payable.dueDate).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{getStatusBadge(payable.status)}</TableCell>
                      <TableCell>
                        {payable.status === "pending" && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            Marcar como Pago
                          </Button>
                        )}
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
