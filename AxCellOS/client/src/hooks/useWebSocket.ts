import { useEffect, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: 'service-order:updated' | 'service-order:created' | 'customer:created' | 'service-order:status-changed';
  data: any;
  timestamp: string;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  useEffect(() => {
    // Simular conexão WebSocket
    setIsConnected(true);
    console.log('[WebSocket] Conectado (simulação)');

    return () => {
      setIsConnected(false);
    };
  }, []);

  const emit = useCallback((message: WebSocketMessage) => {
    setMessages((prev) => [...prev, message]);
    console.log('[WebSocket] Mensagem recebida:', message);
  }, []);

  const simulateStatusChange = useCallback((orderId: number, orderNumber: string, newStatus: string) => {
    emit({
      type: 'service-order:status-changed',
      data: { orderId, orderNumber, newStatus },
      timestamp: new Date().toISOString(),
    });
  }, [emit]);

  const simulateNewOrder = useCallback((order: any) => {
    emit({
      type: 'service-order:created',
      data: order,
      timestamp: new Date().toISOString(),
    });
  }, [emit]);

  const simulateNewCustomer = useCallback((customer: any) => {
    emit({
      type: 'customer:created',
      data: customer,
      timestamp: new Date().toISOString(),
    });
  }, [emit]);

  return {
    isConnected,
    messages,
    emit,
    simulateStatusChange,
    simulateNewOrder,
    simulateNewCustomer,
  };
}
