import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const STATUS_ORDER: Array<'NA BANCADA' | 'Em Reparo' | 'Pronto' | 'Entregue'> = ['NA BANCADA', 'Em Reparo', 'Pronto', 'Entregue'];

const statusLabels: Record<string, { label: string; emoji: string }> = {
  'NA BANCADA': { label: 'NA BANCADA', emoji: '🛠️' },
  'Em Reparo': { label: 'Em Reparo', emoji: '🔧' },
  'Pronto': { label: 'Pronto', emoji: '✅' },
  'Entregue': { label: 'Entregue', emoji: '📦' },
  'Cancelado': { label: 'Cancelado', emoji: '❌' },
};

interface EditStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  currentStatus: 'NA BANCADA' | 'Em Reparo' | 'Pronto' | 'Entregue' | 'Cancelado';
  onStatusChange?: (newStatus: 'NA BANCADA' | 'Em Reparo' | 'Pronto' | 'Entregue' | 'Cancelado') => void;
}

export default function EditStatusDialog({
  open,
  onOpenChange,
  orderNumber,
  currentStatus,
  onStatusChange,
}: EditStatusDialogProps) {
  const idx = STATUS_ORDER.indexOf(currentStatus as any);
  const rawNext = idx >= 0 && idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
  // Entregue só via pagamento, não por botão
  const nextStatus = rawNext === 'Entregue' ? null : rawNext;
  const canCancel = currentStatus !== 'Entregue' && currentStatus !== 'Cancelado';

  const handleAdvance = () => {
    if (nextStatus && onStatusChange) {
      onStatusChange(nextStatus);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (canCancel && onStatusChange) {
      onStatusChange('Cancelado');
      onOpenChange(false);
    }
  };

  if (currentStatus === 'Cancelado' || currentStatus === 'Entregue') {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[97vw] max-w-[97vw] max-h-[97vh] rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">📊 Alterar Status</DialogTitle>
              <DialogDescription>{orderNumber}</DialogDescription>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {nextStatus && (
            <Button
              onClick={handleAdvance}
              className="w-full rounded-xl h-14 bg-primary text-primary-foreground font-bold text-lg gap-2"
            >
              <span>{statusLabels[nextStatus]?.emoji}</span>
              Avançar para {statusLabels[nextStatus]?.label}
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              className="w-full rounded-xl h-12 font-bold"
            >
              ❌ Cancelar Ordem
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
