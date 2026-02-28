import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Package, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function CashRegister() {
  const [activeTab, setActiveTab] = useState("open");
  
  // Formulário de Abertura
  const [openForm, setOpenForm] = useState({
    cashAmount: "",
    cardAmount: "",
    pixAmount: "",
    creditAmount: "",
    fullContainersPhysical: 0,
    emptyContainersPhysical: 0,
    notes: "",
  });

  // Formulário de Fechamento
  const [closeForm, setCloseForm] = useState({
    cashAmount: "",
    cardAmount: "",
    pixAmount: "",
    creditAmount: "",
    totalSales: "",
    fullContainersPhysical: 0,
    emptyContainersPhysical: 0,
    notes: "",
  });

  const { data: todaySessions, refetch: refetchSessions } = trpc.cashRegister.getTodaySessions.useQuery();
  const { data: lastSession } = trpc.cashRegister.getLastSession.useQuery();
  const openMutation = trpc.cashRegister.open.useMutation();
  const closeMutation = trpc.cashRegister.close.useMutation();

  const handleOpenCashRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await openMutation.mutateAsync(openForm);
      toast.success("Caixa aberto com sucesso!");
      setOpenForm({
        cashAmount: "",
        cardAmount: "",
        pixAmount: "",
        creditAmount: "",
        fullContainersPhysical: 0,
        emptyContainersPhysical: 0,
        notes: "",
      });
      refetchSessions();
    } catch (error) {
      toast.error("Erro ao abrir caixa");
    }
  };

  const handleCloseCashRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await closeMutation.mutateAsync(closeForm);
      toast.success("Caixa fechado com sucesso!");
      setCloseForm({
        cashAmount: "",
        cardAmount: "",
        pixAmount: "",
        creditAmount: "",
        totalSales: "",
        fullContainersPhysical: 0,
        emptyContainersPhysical: 0,
        notes: "",
      });
      refetchSessions();
    } catch (error) {
      toast.error("Erro ao fechar caixa");
    }
  };

  // Calcular total de abertura
  const openTotal =
    parseFloat(openForm.cashAmount || "0") +
    parseFloat(openForm.cardAmount || "0") +
    parseFloat(openForm.pixAmount || "0") +
    parseFloat(openForm.creditAmount || "0");

  // Calcular total de fechamento
  const closeTotal =
    parseFloat(closeForm.cashAmount || "0") +
    parseFloat(closeForm.cardAmount || "0") +
    parseFloat(closeForm.pixAmount || "0") +
    parseFloat(closeForm.creditAmount || "0");

  // Calcular diferença (físico vs virtual)
  const difference = closeTotal - parseFloat(closeForm.totalSales || "0");

  // Verificar se já houve abertura hoje
  const hasOpeningToday = todaySessions?.some((s: any) => s.type === "opening");
  const hasClosingToday = todaySessions?.some((s: any) => s.type === "closing");

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Controle de Caixa</h1>
        <div className="flex gap-2">
          {hasOpeningToday && !hasClosingToday && (
            <span className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
              <CheckCircle2 size={20} />
              Caixa Aberto
            </span>
          )}
          {hasClosingToday && (
            <span className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
              <XCircle size={20} />
              Caixa Fechado
            </span>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="open">Abertura</TabsTrigger>
          <TabsTrigger value="close">Fechamento</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* ABA: ABERTURA DE CAIXA */}
        <TabsContent value="open" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <DollarSign className="text-green-600" />
              Abertura de Caixa
            </h2>

            {hasOpeningToday && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800 font-semibold">
                  ⚠️ Já houve uma abertura de caixa hoje. Você pode fazer uma nova abertura se necessário.
                </p>
              </div>
            )}

            <form onSubmit={handleOpenCashRegister} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">💵 Dinheiro (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={openForm.cashAmount}
                    onChange={(e) => setOpenForm({ ...openForm, cashAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">💳 Cartão (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={openForm.cardAmount}
                    onChange={(e) => setOpenForm({ ...openForm, cardAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">📱 PIX (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={openForm.pixAmount}
                    onChange={(e) => setOpenForm({ ...openForm, pixAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">🏦 Fiado (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={openForm.creditAmount}
                    onChange={(e) => setOpenForm({ ...openForm, creditAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-lg font-bold text-blue-800">
                  Total Inicial: R$ {openTotal.toFixed(2)}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">📦 Vasilhames Cheios (físico)</label>
                  <Input
                    type="number"
                    value={openForm.fullContainersPhysical}
                    onChange={(e) =>
                      setOpenForm({ ...openForm, fullContainersPhysical: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">📭 Vasilhames Vazios (físico)</label>
                  <Input
                    type="number"
                    value={openForm.emptyContainersPhysical}
                    onChange={(e) =>
                      setOpenForm({ ...openForm, emptyContainersPhysical: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">📝 Observações</label>
                <Input
                  value={openForm.notes}
                  onChange={(e) => setOpenForm({ ...openForm, notes: e.target.value })}
                  placeholder="Observações sobre a abertura..."
                />
              </div>

              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-lg py-6">
                <CheckCircle2 size={24} className="mr-2" />
                Abrir Caixa
              </Button>
            </form>
          </Card>
        </TabsContent>

        {/* ABA: FECHAMENTO DE CAIXA */}
        <TabsContent value="close" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <XCircle className="text-red-600" />
              Fechamento de Caixa
            </h2>

            {!hasOpeningToday && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 font-semibold">
                  ⚠️ Não há abertura de caixa hoje. Faça a abertura antes de fechar o caixa.
                </p>
              </div>
            )}

            <form onSubmit={handleCloseCashRegister} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">💵 Dinheiro (R$) - Físico</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={closeForm.cashAmount}
                    onChange={(e) => setCloseForm({ ...closeForm, cashAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">💳 Cartão (R$) - Físico</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={closeForm.cardAmount}
                    onChange={(e) => setCloseForm({ ...closeForm, cardAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">📱 PIX (R$) - Físico</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={closeForm.pixAmount}
                    onChange={(e) => setCloseForm({ ...closeForm, pixAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">🏦 Fiado (R$) - Físico</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={closeForm.creditAmount}
                    onChange={(e) => setCloseForm({ ...closeForm, creditAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">💰 Total de Vendas (Virtual - Sistema)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={closeForm.totalSales}
                  onChange={(e) => setCloseForm({ ...closeForm, totalSales: e.target.value })}
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Copie o valor total de vendas do sistema (Dashboard ou Relatórios)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-semibold text-blue-700">Total Físico</p>
                  <p className="text-2xl font-bold text-blue-800">R$ {closeTotal.toFixed(2)}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700">Total Virtual</p>
                  <p className="text-2xl font-bold text-gray-800">
                    R$ {parseFloat(closeForm.totalSales || "0").toFixed(2)}
                  </p>
                </div>

                <div
                  className={`p-4 rounded-lg ${
                    difference > 0
                      ? "bg-green-50"
                      : difference < 0
                      ? "bg-red-50"
                      : "bg-gray-50"
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      difference > 0
                        ? "text-green-700"
                        : difference < 0
                        ? "text-red-700"
                        : "text-gray-700"
                    }`}
                  >
                    Diferença
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      difference > 0
                        ? "text-green-800"
                        : difference < 0
                        ? "text-red-800"
                        : "text-gray-800"
                    }`}
                  >
                    R$ {Math.abs(difference).toFixed(2)}
                    {difference > 0 && " (Sobra)"}
                    {difference < 0 && " (Falta)"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">📦 Vasilhames Cheios (físico)</label>
                  <Input
                    type="number"
                    value={closeForm.fullContainersPhysical}
                    onChange={(e) =>
                      setCloseForm({ ...closeForm, fullContainersPhysical: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">📭 Vasilhames Vazios (físico)</label>
                  <Input
                    type="number"
                    value={closeForm.emptyContainersPhysical}
                    onChange={(e) =>
                      setCloseForm({ ...closeForm, emptyContainersPhysical: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">📝 Observações</label>
                <Input
                  value={closeForm.notes}
                  onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })}
                  placeholder="Observações sobre o fechamento..."
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-lg py-6"
                disabled={!hasOpeningToday}
              >
                <XCircle size={24} className="mr-2" />
                Fechar Caixa
              </Button>
            </form>
          </Card>
        </TabsContent>

        {/* ABA: HISTÓRICO */}
        <TabsContent value="history" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Clock className="text-blue-600" />
              Histórico de Hoje
            </h2>

            {todaySessions && todaySessions.length > 0 ? (
              <div className="space-y-4">
                {todaySessions.map((session: any) => (
                  <div
                    key={session.id}
                    className={`p-4 rounded-lg border-2 ${
                      session.type === "opening"
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold">
                        {session.type === "opening" ? "🟢 Abertura" : "🔴 Fechamento"}
                      </h3>
                      <span className="text-sm text-gray-600">
                        {new Date(session.createdAt).toLocaleTimeString("pt-BR")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="font-semibold">💵 Dinheiro:</p>
                        <p>R$ {parseFloat(session.cashAmount || "0").toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="font-semibold">💳 Cartão:</p>
                        <p>R$ {parseFloat(session.cardAmount || "0").toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="font-semibold">📱 PIX:</p>
                        <p>R$ {parseFloat(session.pixAmount || "0").toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="font-semibold">🏦 Fiado:</p>
                        <p>R$ {parseFloat(session.creditAmount || "0").toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                      <div>
                        <p className="font-semibold">📦 Vasilhames Cheios:</p>
                        <p>{session.fullContainersPhysical || 0}</p>
                      </div>
                      <div>
                        <p className="font-semibold">📭 Vasilhames Vazios:</p>
                        <p>{session.emptyContainersPhysical || 0}</p>
                      </div>
                    </div>

                    {session.notes && (
                      <div className="mt-2 text-sm">
                        <p className="font-semibold">📝 Observações:</p>
                        <p className="text-gray-700">{session.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Nenhuma movimentação de caixa hoje</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
