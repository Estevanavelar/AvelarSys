import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  X as XIcon, Phone as PhoneIcon, Mail as MailIcon, 
  Calendar as CalendarIcon, DollarSign as DollarIcon, 
  Smartphone as SmartphoneIcon, AlertCircle as AlertIcon, 
  Clock as ClockIcon, CheckCircle2 as CheckIcon, 
  Package as PackageIcon, Wrench as WrenchIcon, User as UserIcon,
  Plus as PlusIcon, CheckCircle2, XCircle, FileCheck as FileCheckIcon
} from 'lucide-react';
import { ServiceOrder } from '@/contexts/OrdersContext';
import EditStatusDialog from './EditStatusDialog';
import { ServiceOrderPrinter } from './ServiceOrderPrinter';
import PaymentDialog from './PaymentDialog';
import { ReceiptPrinter, ReceiptData } from './ReceiptPrinter';
import PatternLock, { getPatternLockSequence } from './PatternLock';
import { useOrders } from '@/contexts/OrdersContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface OrderDetailsDialogProps {
  order: ServiceOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_ORDER: Array<ServiceOrder['status']> = ['NA BANCADA', 'Em Reparo', 'Pronto', 'Entregue'];
const statusLabels: Record<string, string> = { 'NA BANCADA': 'NA BANCADA', 'Em Reparo': 'Em Reparo', 'Pronto': 'Pronto', 'Entregue': 'Entregue' };

export default function OrderDetailsDialog({ order, open, onOpenChange }: OrderDetailsDialogProps) {
  const { updateOrderStatus, confirmPayment, cancelOrder } = useOrders();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const idx = order ? STATUS_ORDER.indexOf(order.status) : -1;
  const rawNext = idx >= 0 && idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
  // Entregue só via pagamento
  const nextStatus = rawNext === 'Entregue' ? null : rawNext;
  const canAdvance = order && order.status !== 'Cancelado' && order.status !== 'Entregue' && nextStatus;

  const customerCpf = useMemo(() => {
    const cpfFromOrder = order?.customerCpf?.replace(/\D/g, '');
    if (cpfFromOrder && cpfFromOrder.length === 11) return cpfFromOrder;

    const cpfFromName = order?.customerName?.replace(/\D/g, '');
    if (cpfFromName && cpfFromName.length === 11) return cpfFromName;

    return undefined;
  }, [order?.customerCpf, order?.customerName]);

  const customerQuery = trpc.customers.getCustomer.useQuery(
    { id: customerCpf || '' },
    {
      enabled: Boolean(customerCpf),
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const { data: warrantyTermsList = [] } = trpc.settings.getWarrantyTerms.useQuery();

  const customerPhone = order?.customerPhone || customerQuery.data?.whatsapp || '';
  const whatsappDigits = customerPhone.replace(/\D/g, '');
  const whatsappNumber = whatsappDigits.length >= 10
    ? (whatsappDigits.startsWith('55') ? whatsappDigits : `55${whatsappDigits}`)
    : '';
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '';

  const formatCpf = (cpf?: string) => {
    if (!cpf) return '';
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return cpf;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const customerNameDisplay = (() => {
    const nameFromQuery = customerQuery.data?.name?.trim();
    if (nameFromQuery) return nameFromQuery;

    const rawName = (order?.customerName || '').trim();
    const rawDigits = rawName.replace(/\D/g, '');
    if (rawDigits.length === 11) return 'Cliente';
    return rawName || 'Cliente';
  })();

  const customerCpfDisplay = formatCpf(customerCpf || customerQuery.data?.id || '');

  const parseCurrencyFromText = (raw?: string | null) => {
    if (!raw) return 0;
    const normalized = raw
      .replace(/[^\d,.-]/g, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '')
      .replace(',', '.')
      .trim();
    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) ? value : 0;
  };

  const formatBRL = (value: number) =>
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  /** Notas sem linhas de mudança de status — usada para extrair valores financeiros e exibir observações */
  const notesWithoutStatusLines = useMemo(() => {
    const raw = (order?.notes || '').trim();
    if (!raw) return '';
    const parts = raw.split(/\s*\|\s*/).filter((p) => !/^\s*Status alterado para\s+/i.test(p.trim()));
    return parts.map((p) => p.trim()).filter(Boolean).join(' | ');
  }, [order?.notes]);

  /** Notas sem "Status alterado..." e sem bloco "PaymentInfo:{...}" — só o texto original para Observações Internas */
  const notesWithoutStatusAndPayment = useMemo(() => {
    const raw = (notesWithoutStatusLines || order?.notes || '').trim();
    if (!raw) return '';
    const parts = raw.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
    const filtered = parts.filter((p) => !/^\s*PaymentInfo:\s*\{/.test(p));
    return filtered.join(' | ');
  }, [notesWithoutStatusLines, order?.notes]);

  const paymentMethodLabel = (method: string) => {
    const m = (method || '').toLowerCase();
    if (m === 'cash' || m === 'dinheiro') return 'Dinheiro';
    if (m === 'pix') return 'PIX';
    if (m === 'credit' || m === 'credito' || m === 'cartão' || m === 'cartao') return 'Cartão de crédito';
    if (m === 'debit' || m === 'débito' || m === 'debito') return 'Cartão de débito';
    return method || '—';
  };

  /** Observações para exibir: texto original das notas + forma de pagamento (se houver) */
  const notesForDisplay = useMemo(() => {
    const original = notesWithoutStatusAndPayment.trim();
    const payment = order?.paymentInfo?.method != null && order.paymentInfo.method !== ''
      ? `Forma de pagamento: ${paymentMethodLabel(order.paymentInfo.method)}`
      : '';
    if (!original && !payment) return '';
    return [original, payment].filter(Boolean).join(' | ');
  }, [notesWithoutStatusAndPayment, order?.paymentInfo?.method]);

  const financial = useMemo(() => {
    const notes = notesWithoutStatusLines || order?.notes || '';
    const laborMatch = notes.match(/M[aã]o\s*de\s*obra:\s*([^|]+)/i);
    // Priorizar "Custo peça" para valor monetário; "Peças:" contém lista de nomes, não valor
    const partsCostMatch = notes.match(/Custo\s*pe[cç]a[s]?:\s*([^|]+)/i);
    const totalFromNotesMatch = notes.match(/Total informado:\s*R\$\s*([^|]+)/i);

    const laborFromOrder = Number(order?.laborValue || 0);
    const partsFromOrder = Number(order?.partsValue || 0);
    const laborFromNotes = parseCurrencyFromText(laborMatch?.[1]);
    const partsFromNotes = parseCurrencyFromText(partsCostMatch?.[1]);
    const labor = laborFromOrder > 0 ? laborFromOrder : laborFromNotes;
    const parts = partsFromOrder > 0 ? partsFromOrder : partsFromNotes;

    const totalFromParts = labor + parts;
    const totalFromNotes = parseCurrencyFromText(totalFromNotesMatch?.[1]);
    const totalFromOrder = Number(order?.totalValue || 0);

    const total =
      totalFromParts > 0
        ? totalFromParts
        : totalFromOrder > 0
          ? totalFromOrder
          : totalFromNotes;

    return { labor, parts, total };
  }, [notesWithoutStatusLines, order?.notes, order?.totalValue, order?.laborValue, order?.partsValue]);

  const statusConfig = {
    'NA BANCADA': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border-blue-200/50', icon: '🛠️' },
    'Em Reparo': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 border-yellow-200/50', icon: '🔧' },
    'Pronto': { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-200/50', icon: '✅' },
    'Entregue': { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 border-purple-200/50', icon: '📦' },
    'Cancelado': { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border-red-200/50', icon: '❌' },
  };

  const config = statusConfig[order?.status as keyof typeof statusConfig] || { color: 'bg-gray-100 text-gray-800', icon: '❓' };

  const handleAdvanceStatus = () => {
    if (!order || !nextStatus) return;
    updateOrderStatus(order.id, nextStatus, order.notes ?? undefined);
  };

  const handlePaymentConfirm = async (paymentData: { method: string; installments: number; feeAmount: number; netValue: number; feePercent?: number }) => {
    if (!order) return;
    try {
      await confirmPayment(order.id, paymentData);
      setShowPaymentDialog(false);
      toast.success('Pagamento confirmado! Ordem marcada como Entregue.');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao confirmar pagamento');
    }
  };

  if (!order) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[97vw] max-w-[97vw] h-[97vh] max-h-[97vh] rounded-2xl overflow-y-auto p-0 gap-0">
          <div className="flex flex-col h-full">
            {/* Header Fixo */}
            <DialogHeader className="p-6 border-b sticky top-0 bg-background z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-4xl bg-muted w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner">
                    {order.emoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-2xl font-bold">{order.orderNumber}</DialogTitle>
                      <Badge variant="outline" className={`${config.color} border px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider`}>
                        {config.icon} {order.status}
                      </Badge>
                    </div>
                    <DialogDescription className="text-lg font-medium text-foreground/80">
                      {customerNameDisplay}{customerCpfDisplay ? ` - CPF ${customerCpfDisplay}` : ''}
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {canAdvance && (
                    <Button
                      onClick={handleAdvanceStatus}
                      className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                    >
                      <CheckIcon className="w-4 h-4" />
                      Avançar para {statusLabels[nextStatus!]}
                    </Button>
                  )}
                  {order.status !== 'Entregue' && order.status !== 'Cancelado' && (
                    <Button
                      variant={canAdvance ? 'outline' : 'default'}
                      disabled={isCancelling}
                      onClick={async () => {
                        if (!window.confirm('Deseja realmente cancelar esta OS?')) return;
                        try {
                          setIsCancelling(true);
                          await cancelOrder(order.id);
                          toast.success('OS cancelada.');
                          onOpenChange(false);
                        } catch {
                          toast.error('Não foi possível cancelar a OS.');
                        } finally {
                          setIsCancelling(false);
                        }
                      }}
                      className="gap-2 rounded-xl font-bold"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancelar OS
                    </Button>
                  )}
                  {order.status === 'Pronto' && (
                    <Button
                      onClick={() => setShowPaymentDialog(true)}
                      className="gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold"
                    >
                      <DollarIcon className="w-4 h-4" />
                      Fechar Pagamento
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpenChange(false)}
                    className="rounded-full"
                  >
                    <XIcon className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Conteúdo com Scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-24">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Coluna 1 & 2: Detalhes do Serviço */}
                <div className="lg:col-span-2 space-y-8">
                  <section className="space-y-4">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                      <AlertIcon className="w-4 h-4" />
                      Informações do Serviço
                    </h3>
                    <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 space-y-6 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-bold uppercase">Aparelho</p>
                          <p className="text-xl font-bold flex items-center gap-2">
                            <SmartphoneIcon className="w-5 h-5 text-muted-foreground" />
                            {order.deviceBrand} {order.deviceModel}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-bold uppercase">Data de Entrada</p>
                          <p className="text-xl font-bold flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                            {order.createdAt.toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        {order.warrantyUntil && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-bold uppercase">Garantia Válida Até</p>
                            <p className="text-xl font-bold flex items-center gap-2 text-green-600 dark:text-green-400">
                              <ClockIcon className="w-5 h-5" />
                              {new Date(order.warrantyUntil).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        )}
                        {order.warrantyTermIds && order.warrantyTermIds.length > 0 && (
                          <div className="space-y-1 md:col-span-2">
                            <p className="text-xs text-muted-foreground font-bold uppercase flex items-center gap-1">
                              <FileCheckIcon className="w-3.5 h-3.5" /> Termos de Garantia
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {order.warrantyTermIds.map((id) => {
                                const term = warrantyTermsList.find((t) => t.id === id);
                                const label = term?.title ?? id;
                                return (
                                  <Badge key={id} variant="secondary" className="text-xs" title={term ? undefined : `ID: ${id}`}>
                                    {label}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <Separator className="opacity-50" />
                      
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-bold uppercase">Defeito Relatado</p>
                        <div className="bg-background/50 border rounded-xl p-4 text-lg leading-relaxed italic text-foreground/90">
                          "{order.defect || 'Defeito não informado'}"
                        </div>
                      </div>

                      {(() => {
                        const m = order.notes?.match(/(?:Peças|Pecas):\s*(.+?)(?:\s*\||$)/i);
                        const parts = m?.[1]?.split(',').map(s => s.trim()).filter(Boolean) ?? [];
                        if (parts.length === 0) return null;
                        return (
                          <div key="parts" className="space-y-2">
                            <p className="text-xs text-muted-foreground font-bold uppercase">Peças Solicitadas</p>
                            <ul className="list-disc pl-5 space-y-1 text-foreground/90">
                              {parts.map((p, i) => (
                                <li key={i}>{p}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}

                      {order.devicePassword && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-bold uppercase">Senha do aparelho (PIN / padrão)</p>
                          {(() => {
                            const patternValue = getPatternLockSequence(order.devicePassword);
                            if (patternValue) {
                              return (
                                <div className="bg-background/50 border rounded-xl p-4 inline-block">
                                  <PatternLock value={patternValue} readOnly />
                                </div>
                              );
                            }
                            return (
                              <p className="bg-background/50 border rounded-xl p-4 text-lg font-mono font-bold tracking-widest text-foreground">
                                {order.devicePassword}
                              </p>
                            );
                          })()}
                        </div>
                      )}

                      {notesForDisplay && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-bold uppercase">Observações Internas</p>
                          <p className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4 text-foreground/80">
                            {notesForDisplay}
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Histórico/Timeline */}
                  {order.history && order.history.length > 0 && (
                    <section className="space-y-4">
                      <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <ClockIcon className="w-4 h-4" />
                        Linha do Tempo
                      </h3>
                      <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 shadow-sm">
                        <div className="space-y-6">
                          {order.history.map((entry, index) => (
                            <div key={index} className="flex gap-4 relative">
                              {index < order.history!.length - 1 && (
                                <div className="absolute left-[11px] top-6 bottom-[-24px] w-[2px] bg-border/50"></div>
                              )}
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 shrink-0 ${
                                index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border text-muted-foreground'
                              }`}>
                                <CheckIcon className="w-4 h-4" />
                              </div>
                              <div className="space-y-1 pb-2">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-foreground">{entry.status}</p>
                                  <span className="text-[10px] bg-background border px-2 py-0.5 rounded-full text-muted-foreground font-medium">
                                    {new Date(entry.timestamp).toLocaleString('pt-BR')}
                                  </span>
                                </div>
                                {entry.notes && (
                                  <p className="text-sm text-muted-foreground leading-relaxed bg-background/40 p-2 rounded-lg border border-border/30">
                                    {entry.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}
                </div>

                {/* Coluna 3: Cliente e Financeiro */}
                <div className="space-y-8">
                  {/* Card Cliente */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      Dados do Cliente
                    </h3>
                    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                          <UserIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Nome do Cliente</p>
                          <p className="font-bold text-lg">{customerNameDisplay}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                          <MailIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">CPF</p>
                          <p className="font-bold text-lg">{customerCpfDisplay || 'Não informado'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                          <PhoneIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Telefone / WhatsApp</p>
                          <p className="font-bold text-lg">{customerPhone || 'Não informado'}</p>
                        </div>
                      </div>
                      {order.customerEmail && (
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-primary/10 rounded-xl text-primary">
                            <MailIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">E-mail</p>
                            <p className="font-bold truncate">{order.customerEmail}</p>
                          </div>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        className="w-full rounded-xl border-border/60 hover:bg-primary/5 hover:text-primary gap-2"
                        disabled={!whatsappLink}
                        onClick={() => {
                          if (!whatsappLink) return;
                          window.open(whatsappLink, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <PhoneIcon className="w-4 h-4" />
                        Chamar no WhatsApp
                      </Button>
                    </div>
                  </section>

                  {/* Card Financeiro */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                      <DollarIcon className="w-4 h-4" />
                      Resumo Financeiro
                    </h3>
                    <div className="bg-green-500/5 dark:bg-green-500/10 border border-green-500/20 rounded-2xl p-5 space-y-4 shadow-sm">
                      <div className="space-y-1">
                        <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase flex items-center gap-1">
                          <WrenchIcon className="w-3 h-3" /> Mão de Obra
                        </p>
                        <p className="text-xl font-bold text-foreground">{formatBRL(financial.labor)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase flex items-center gap-1">
                          <PackageIcon className="w-3 h-3" /> Peças
                        </p>
                        <p className="text-xl font-bold text-foreground">{formatBRL(financial.parts)}</p>
                      </div>
                      <Separator className="bg-green-500/20" />
                      <div className="space-y-1 pt-2">
                        <p className="text-[10px] text-green-700 dark:text-green-300 font-bold uppercase">Valor Total do Serviço</p>
                        <p className="text-3xl font-black text-green-600 dark:text-green-400">
                          {formatBRL(financial.total)}
                        </p>
                      </div>
                      {order.paymentInfo && (
                        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 space-y-3 shadow-sm">
                          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                            <CheckCircle2 className="w-4 h-4" />
                            Pagamento Confirmado
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase font-black">Método</p>
                              <p className="font-bold capitalize">{order.paymentInfo.method} {order.paymentInfo.installments > 1 ? `(${order.paymentInfo.installments}x)` : ''}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase font-black">Líquido Recebido</p>
                              <p className="font-bold text-green-600">R$ {(order.paymentInfo.netValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>

            {/* Footer Fixo */}
            <div className="p-6 border-t bg-muted/20 flex flex-col sm:flex-row gap-3 sticky bottom-0 z-10">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 rounded-xl h-14 font-bold text-base transition-all active:scale-95"
              >
                Fechar Detalhes
              </Button>
              
              <ServiceOrderPrinter order={order} />

              {order.status === 'Entregue' && order.paymentInfo && (
                <div className="flex-1">
                  <ReceiptPrinter 
                    format="58mm"
                    data={{
                      id: order.orderNumber,
                      date: order.paymentInfo.date,
                      items: [{
                        name: `Serviço: ${order.deviceBrand} ${order.deviceModel} - ${order.defect}`,
                        quantity: 1,
                        price: order.totalValue || 0,
                        total: order.totalValue || 0
                      }],
                      subtotal: order.totalValue || 0,
                      tax: order.paymentInfo.feeAmount,
                      total: order.totalValue || 0,
                      paymentMethod: order.paymentInfo.method,
                      customerName: order.customerName,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        totalValue={financial.total}
        orderNumber={order.orderNumber}
        onConfirm={handlePaymentConfirm}
      />
    </>
  );
}
