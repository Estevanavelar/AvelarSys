import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageCircle, Send } from 'lucide-react';

interface WhatsAppNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  whatsappNumber: string;
  orderNumber: string;
  notificationType?: 'order_created' | 'status_changed' | 'custom';
  onSend?: (message: string) => void;
}

export default function WhatsAppNotificationDialog({
  open,
  onOpenChange,
  customerName,
  whatsappNumber,
  orderNumber,
  notificationType = 'custom',
  onSend,
}: WhatsAppNotificationDialogProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const templates = {
    order_created: `Olá ${customerName}! 👋\n\nSua ordem de serviço foi registrada com sucesso!\n\n📋 Número da OS: ${orderNumber}\n\nVocê receberá atualizações sobre o status do seu dispositivo.`,
    status_changed: `Olá ${customerName}! 🔔\n\nO status da sua ordem ${orderNumber} foi atualizado!\n\nAcesse o link para mais informações.`,
    custom: '',
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    setIsSending(true);
    try {
      if (onSend) {
        onSend(message);
      }
      console.log('[WhatsApp] Enviando mensagem:', {
        to: whatsappNumber,
        message,
      });
      
      setMessage('');
      onOpenChange(false);
    } finally {
      setIsSending(false);
    }
  };

  const loadTemplate = (templateType: string) => {
    setMessage(templates[templateType as keyof typeof templates] || '');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[97vw] max-w-[97vw] max-h-[97vh] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-green-500" />
            WhatsApp
          </DialogTitle>
          <DialogDescription>{customerName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient Info */}
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-xs text-green-600 dark:text-green-400 font-semibold">DESTINATÁRIO</p>
            <p className="text-sm font-semibold text-foreground">{whatsappNumber}</p>
          </div>

          {/* Templates */}
          {notificationType !== 'custom' && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Modelos Disponíveis</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => loadTemplate('order_created')}
                  className="text-xs"
                >
                  Confirmação
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => loadTemplate('status_changed')}
                  className="text-xs"
                >
                  Status
                </Button>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-semibold">Mensagem</Label>
            <Textarea
              id="message"
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="rounded-xl min-h-32 resize-none"
            />
            <p className="text-xs text-muted-foreground">{message.length} caracteres</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl h-12"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={!message.trim() || isSending}
              className="flex-1 gap-2 bg-green-500 text-white hover:bg-green-600 rounded-xl h-12 font-semibold"
            >
              <Send className="w-4 h-4" />
              {isSending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
