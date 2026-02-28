import React, { useMemo, useState } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CreditCard, DollarSign, Wallet, Percent, CheckCircle2, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/lib/trpc';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalValue: number;
  orderNumber: string;
  onConfirm: (paymentData: any) => void;
}

const DEFAULT_FEES = {
  debit: 1.99,
  credit1x: 3.49,
  installments: {
    2: 4.99,
    3: 5.99,
    4: 6.99,
    5: 7.99,
    6: 8.99,
    7: 9.99,
    8: 10.99,
    9: 11.99,
    10: 12.99,
    11: 13.99,
    12: 14.99,
  } as Record<number, number>,
};

export default function PaymentDialog({ 
  open, onOpenChange, totalValue, orderNumber, onConfirm 
}: PaymentDialogProps) {
  const [method, setMethod] = useState<'cash' | 'credit' | 'debit' | 'pix'>('cash');
  const [installments, setInstallments] = useState(1);
  const [passFeeToCustomer, setPassFeeToCustomer] = useState(false);
  
  const { data: feesSetting } = trpc.settings.getSetting.useQuery({ key: 'fees' });
  const feeSettings = useMemo(() => {
    const fromApi = feesSetting?.value as any;
    if (fromApi) return { ...DEFAULT_FEES, ...fromApi };
    try {
      const raw = localStorage.getItem('axcellos_fees');
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed) return { ...DEFAULT_FEES, ...parsed };
      return DEFAULT_FEES;
    } catch {
      return DEFAULT_FEES;
    }
  }, [feesSetting?.value]);

  const calculateNet = () => {
    let feePercent = 0;
    if (method === 'debit') feePercent = feeSettings.debit;
    else if (method === 'credit') {
      if (installments === 1) feePercent = feeSettings.credit1x;
      else feePercent = feeSettings.installments[installments] || 0;
    }

    // Sem repasse: cliente paga totalValue e loja recebe líquido após taxa.
    // Com repasse: calcula valor cobrado para que o líquido final seja totalValue.
    const chargedValue = passFeeToCustomer && feePercent > 0
      ? totalValue / (1 - feePercent / 100)
      : totalValue;
    const feeAmount = (chargedValue * feePercent) / 100;

    return {
      charged: chargedValue,
      net: chargedValue - feeAmount,
      fee: feeAmount,
      percent: feePercent
    };
  };

  const netInfo = calculateNet();

  const handleConfirm = () => {
    onConfirm({
      method,
      installments: method === 'credit' ? installments : 1,
      totalValue: netInfo.charged,
      feeAmount: netInfo.fee,
      netValue: netInfo.net,
      feePercent: netInfo.percent,
      passFeeToCustomer,
      date: new Date()
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[97vw] max-w-[97vw] max-h-[97vh] rounded-[32px] p-0 overflow-hidden border-none bg-background shadow-2xl flex flex-col">
        <div className="bg-primary/5 p-6 border-b border-primary/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 text-primary p-2 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black">Receber Pagamento</DialogTitle>
                <DialogDescription className="font-bold text-primary/60">{orderNumber}</DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="text-center space-y-1 bg-muted/30 p-6 rounded-3xl border border-border/50 shadow-inner">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Valor a Receber</p>
            <h3 className="text-4xl font-black text-foreground">
              R$ {(netInfo.charged || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            {passFeeToCustomer && netInfo.percent > 0 && (
              <p className="text-[11px] font-medium text-muted-foreground">
                Valor original do serviço: R$ {(totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground ml-1">Forma de Pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cash', label: 'Dinheiro', icon: Wallet },
                  { id: 'pix', label: 'PIX', icon: CheckCircle2 },
                  { id: 'debit', label: 'Débito', icon: CreditCard },
                  { id: 'credit', label: 'Crédito', icon: CreditCard },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id as any)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all font-bold text-sm ${
                      method === m.id 
                        ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                        : 'border-border hover:border-primary/30 text-muted-foreground'
                    }`}
                  >
                    <m.icon className="w-4 h-4" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {method === 'credit' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label className="text-xs font-black uppercase text-muted-foreground ml-1">Parcelamento</Label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(parseInt(e.target.value))}
                  className="w-full bg-background border-2 border-border rounded-2xl px-4 h-12 font-bold focus:border-primary outline-none transition-all"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                    <option key={n} value={n}>{n}x {n === 1 ? 'à vista' : 'vezes'}</option>
                  ))}
                </select>
              </div>
            )}

            {(method === 'credit' || method === 'debit') && (
              <label className="flex items-center gap-2 p-3 rounded-xl border border-border/60 bg-muted/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={passFeeToCustomer}
                  onChange={(e) => setPassFeeToCustomer(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm font-semibold text-foreground">
                  Repassar taxas para o cliente
                </span>
              </label>
            )}
          </div>

          <Separator className="opacity-50" />

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">Taxa da Maquininha ({netInfo.percent}%):</span>
              <span className="text-red-500 font-bold">- R$ {(netInfo.fee || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-500/5 rounded-2xl border border-green-500/10">
              <span className="text-green-700 dark:text-green-400 font-black uppercase text-xs tracking-tighter">Recebimento Líquido:</span>
              <span className="text-xl font-black text-green-600 dark:text-green-400">
                R$ {(netInfo.net || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-muted/20 border-t border-border flex gap-3 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-2xl h-14 font-bold">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="flex-[2] rounded-2xl h-14 bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
            CONFIRMAR RECEBIMENTO
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
