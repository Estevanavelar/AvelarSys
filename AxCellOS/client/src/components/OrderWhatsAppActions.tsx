import { useState } from 'react';
import { MessageCircle, Bell, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WhatsAppNotificationDialog from './WhatsAppNotificationDialog';

interface OrderWhatsAppActionsProps {
  orderNumber: string;
  customerName: string;
  whatsappNumber: string;
  status: 'NA BANCADA' | 'Em Reparo' | 'Pronto' | 'Entregue';
}

export default function OrderWhatsAppActions({
  orderNumber,
  customerName,
  whatsappNumber,
  status,
}: OrderWhatsAppActionsProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [notificationType, setNotificationType] = useState<'order_created' | 'status_changed' | 'custom'>('custom');

  const handleSendStatusNotification = () => {
    setNotificationType('status_changed');
    setShowDialog(true);
  };

  const handleSendCustomMessage = () => {
    setNotificationType('custom');
    setShowDialog(true);
  };

  const handleMessageSent = (message: string) => {
    console.log('[OrderWhatsAppActions] Mensagem enviada:', {
      orderNumber,
      customerName,
      whatsappNumber,
      message,
    });
    // Aqui será integrado com tRPC para enviar a mensagem
  };

  if (!whatsappNumber) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          ⚠️ Número de WhatsApp não configurado para este cliente
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <h3 className="font-semibold text-foreground">Comunicação via WhatsApp</h3>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">Número:</span> {whatsappNumber}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleSendStatusNotification}
            className="gap-2 bg-green-500 text-white hover:bg-green-600 rounded-xl h-10"
            size="sm"
          >
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notificar Status</span>
            <span className="sm:hidden">Status</span>
          </Button>
          <Button
            onClick={handleSendCustomMessage}
            variant="outline"
            className="gap-2 rounded-xl h-10"
            size="sm"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Mensagem</span>
            <span className="sm:hidden">Msg</span>
          </Button>
        </div>
      </div>

      <WhatsAppNotificationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        customerName={customerName}
        whatsappNumber={whatsappNumber}
        orderNumber={orderNumber}
        notificationType={notificationType}
        onSend={handleMessageSent}
      />
    </>
  );
}
