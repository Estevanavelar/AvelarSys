import { ChevronRight, Clock, FileCheck } from 'lucide-react';
import { useLocation } from 'wouter';

interface ServiceOrderCardProps {
  order: any; // Using any for simplicity, it should be ServiceOrder
  onClick?: (order: any) => void;
}

export default function ServiceOrderCard({ order, onClick }: ServiceOrderCardProps) {
  const statusConfig = {
    'NA BANCADA': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border-blue-200/50', icon: '🛠️' },
    'Em Reparo': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 border-yellow-200/50', icon: '🔧' },
    'Pronto': { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-200/50', icon: '📦' },
    'Entregue': { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 border-purple-200/50', icon: '✅' },
    'Cancelado': { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border-red-200/50', icon: '❌' },
  };

  const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig['NA BANCADA'];
  const formattedDate = order.createdAt instanceof Date 
    ? order.createdAt.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
    : '';

  // Cálculo de garantia (selo mostra só o número de dias)
  const getWarrantyInfo = () => {
    if (!order.warrantyUntil || order.status !== 'Entregue') return null;
    const today = new Date();
    const warrantyDate = new Date(order.warrantyUntil);
    const diffTime = warrantyDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: '0', color: 'text-red-500 bg-red-100' };
    if (diffDays <= 7) return { label: String(diffDays), color: 'text-orange-500 bg-orange-100 animate-pulse' };
    return { label: String(diffDays), color: 'text-green-600 bg-green-100' };
  };

  const warrantyInfo = getWarrantyInfo();

  const customerNameDisplay = (() => {
    const raw = String(order.customerName || '').trim();
    const digits = raw.replace(/\D/g, '');
    if (!raw) return 'Não informado';
    if (digits.length === 11 && raw.length <= 14) return 'Não informado';
    return raw;
  })();

  const formatBRL = (value: number) =>
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalValue = Number(order.totalValue || (Number(order.laborValue || 0) + Number(order.partsValue || 0)));
  const modelDisplay = String(order.deviceModel || order.deviceBrand || '').trim();

  return (
    <button
      onClick={() => onClick?.(order)}
      className="w-full bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:shadow-lg transition-all hover:border-primary text-left group active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-3xl flex-shrink-0">{order.status === 'Entregue' ? config.icon : (order.emoji || '🛠️')}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{order.orderNumber}</p>
            </div>
            <p className="font-bold text-foreground truncate">{customerNameDisplay}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0 mt-1">
          {warrantyInfo && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${warrantyInfo.color}`}>
              <Clock className="w-2.5 h-2.5" />
              {warrantyInfo.label}
            </span>
          )}
          {modelDisplay && (
            <span className="text-[10px] font-bold uppercase text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md max-w-[120px] truncate">
              {modelDisplay}
            </span>
          )}
          {order.warrantyTermIds && order.warrantyTermIds.length > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md flex items-center gap-1" title={`Termos: ${order.warrantyTermIds.join(', ')}`}>
              <FileCheck className="w-2.5 h-2.5" />
              {order.warrantyTermIds.length} termo{order.warrantyTermIds.length !== 1 ? 's' : ''}
            </span>
          )}
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{order.defect}</p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${config.color}`}>
          {config.icon} {order.status}
        </span>
        <div className="flex flex-col items-end leading-tight">
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
          <span className="text-sm font-bold text-foreground">{formatBRL(totalValue)}</span>
        </div>
      </div>
    </button>
  );
}
