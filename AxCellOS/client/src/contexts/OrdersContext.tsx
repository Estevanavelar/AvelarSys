import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';

export interface ServiceOrder {
  id: string;
  orderNumber: string;
  customerCpf?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deviceBrand: string;
  deviceModel: string;
  defect: string;
  status: 'NA BANCADA' | 'Em Reparo' | 'Pronto' | 'Entregue' | 'Cancelado';
  createdAt: Date;
  warrantyUntil?: Date | null;
  totalValue?: number;
  laborValue?: number;
  partsValue?: number;
  paymentInfo?: {
    method: string;
    installments: number;
    feeAmount: number;
    netValue: number;
    date: Date;
  };
  emoji: string;
  notes?: string;
  devicePassword?: string;
  warrantyTermIds?: string[];
  estimatedCost?: string;
  history?: Array<{
    status: string;
    timestamp: Date;
    notes?: string;
  }>;
}

interface OrdersContextType {
  orders: ServiceOrder[];
  addOrder: (order: Omit<ServiceOrder, 'id' | 'orderNumber' | 'createdAt'>) => Promise<{ orderNumber: string } | undefined>;
  updateOrder: (id: string, updates: Partial<ServiceOrder>) => Promise<void>;
  updateOrderStatus: (id: string, newStatus: ServiceOrder['status'], notes?: string) => Promise<void>;
  confirmPayment: (orderId: string, payment: { method: string; installments: number; feeAmount: number; netValue: number; feePercent?: number }) => Promise<void>;
  cancelOrder: (id: string) => Promise<void>;
  getOrderById: (id: string) => ServiceOrder | undefined;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const ordersQuery = trpc.orders.getOrders.useQuery({
    limit: 200,
    offset: 0,
  });
  const customersQuery = trpc.customers.getCustomers.useQuery({
    isActive: true,
    limit: 200,
    offset: 0,
  });
  const createOrder = trpc.orders.createOrder.useMutation();
  const linkCustomerMutation = trpc.customers.linkCustomer.useMutation();
  const updateOrderMutation = trpc.orders.updateOrder.useMutation();
  const confirmPaymentMutation = trpc.orders.confirmPayment.useMutation();
  const cancelOrderMutation = trpc.orders.cancelOrder.useMutation();

  const mappedOrders = useMemo(() => {
    if (!ordersQuery.data) return [];
    const statusMap: Record<string, ServiceOrder['status']> = {
      draft: 'NA BANCADA',
      pending: 'NA BANCADA',
      confirmed: 'NA BANCADA',
      preparing: 'Em Reparo',
      ready: 'Pronto',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
    };

    const extractFieldFromNotes = (notes: string | null | undefined, regex: RegExp) => {
      if (!notes) return '';
      const match = notes.match(regex);
      return match?.[1]?.trim() || '';
    };

    /** Remove "Status alterado para X" e "PaymentInfo:{...}" das notas para obter só o conteúdo original (ex.: Defeito, Aparelho, etc.) */
    const notesWithoutStatusAndPayment = (raw: string | null | undefined) => {
      if (!raw) return '';
      const parts = raw.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
      const filtered = parts.filter(
        (p) =>
          !/^\s*Status alterado para\s+/i.test(p) &&
          !/^\s*PaymentInfo:\s*\{/.test(p)
      );
      return filtered.join(' | ');
    };

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

    const extractDeviceFromNotes = (notes: string | null | undefined) => {
      const rawDevice = extractFieldFromNotes(notes, /Aparelho:\s*([^|]+)/i);
      if (!rawDevice) return { brand: '', model: '' };
      const parts = rawDevice.trim().split(/\s+/);
      const brand = parts[0] || '';
      const model = parts.slice(1).join(' ');
      return { brand, model };
    };

    const customerById = new Map(
      (customersQuery.data || []).map((customer) => [customer.id, customer])
    );

    return ordersQuery.data.map((order) => ({
      ...(() => {
        const device = extractDeviceFromNotes(order.notes);
        const cleanNotes = notesWithoutStatusAndPayment(order.notes);
        const defect = extractFieldFromNotes(cleanNotes, /Defeito:\s*([^|]+)/i) || extractFieldFromNotes(order.notes, /Defeito:\s*([^|]+)/i) || '';
        const linkedCustomer = order.customerId ? customerById.get(order.customerId) : undefined;
        const customerNameFromNotes = extractFieldFromNotes(order.notes, /Cliente:\s*([^|]+)/i) || '';
        const customerPhoneFromNotes = extractFieldFromNotes(order.notes, /WhatsApp:\s*([^|]+)/i) || '';
        const laborFromNotes = parseCurrencyFromText(
          extractFieldFromNotes(order.notes, /M[aã]o\s*de\s*obra:\s*([^|]+)/i)
        );
        const partsFromNotes = parseCurrencyFromText(
          extractFieldFromNotes(order.notes, /Custo\s*pe[cç]a[s]?:\s*([^|]+)/i)
        );
        const totalFromNotes = parseCurrencyFromText(
          extractFieldFromNotes(order.notes, /Total informado:\s*R\$\s*([^|]+)/i)
        );
        const totalFromOrder = Number(order.totalAmount || 0);
        const totalValue =
          totalFromOrder > 0 ? totalFromOrder : laborFromNotes + partsFromNotes > 0 ? laborFromNotes + partsFromNotes : totalFromNotes;
        return {
          deviceBrand: device.brand,
          deviceModel: device.model,
          defect,
          customerName: linkedCustomer?.name || customerNameFromNotes || '',
          customerPhone: linkedCustomer?.whatsapp || customerPhoneFromNotes || '',
          laborValue: laborFromNotes,
          partsValue: partsFromNotes,
          totalValue,
        };
      })(),
      id: order.id,
      orderNumber: order.orderNumber,
      customerCpf: order.customerId || undefined,
      customerEmail: undefined,
      status: statusMap[order.status] || 'NA BANCADA',
      createdAt: new Date(order.createdAt),
      warrantyUntil: order.warrantyUntil ? new Date(order.warrantyUntil) : null,
      paymentInfo: (() => {
        const notes = order.notes || '';
        const idx = notes.indexOf('PaymentInfo:');
        if (idx < 0) return undefined;
        const start = notes.indexOf('{', idx);
        if (start < 0) return undefined;
        let depth = 0;
        let end = -1;
        for (let i = start; i < notes.length; i++) {
          if (notes[i] === '{') depth++;
          else if (notes[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
        }
        if (end < 0) return undefined;
        try {
          const parsed = JSON.parse(notes.slice(start, end + 1));
          return {
            method: parsed.method || '',
            installments: parsed.installments ?? 1,
            feeAmount: parsed.feeAmount ?? 0,
            netValue: parsed.netValue ?? 0,
            date: parsed.date ? new Date(parsed.date) : new Date(),
          };
        } catch {
          return undefined;
        }
      })(),
      emoji: order.status === 'delivered' ? '📦' : order.status === 'ready' ? '✅' : order.status === 'preparing' ? '🔧' : '🛠️',
      notes: order.notes || undefined,
      devicePassword: order.devicePassword || undefined,
      estimatedCost: undefined,
      history: undefined,
      warrantyTermIds: Array.isArray((order as { warrantyTermIds?: string[] }).warrantyTermIds)
        ? (order as { warrantyTermIds: string[] }).warrantyTermIds
        : [],
    })) as ServiceOrder[];
  }, [ordersQuery.data, customersQuery.data]);

  useEffect(() => {
    if (!ordersQuery.data) return;
    setOrders(mappedOrders);
  }, [mappedOrders, ordersQuery.data]);

  const addOrder = async (order: Omit<ServiceOrder, 'id' | 'orderNumber' | 'createdAt'>) => {
    try {
      const customerId = order.customerCpf || extractCustomerId(order.customerName);
      if (customerId && customerId.length === 11) {
        await linkCustomerMutation.mutateAsync({ customerId });
      }

      const notes = [
        order.deviceBrand || order.deviceModel ? `Aparelho: ${order.deviceBrand} ${order.deviceModel}`.trim() : null,
        order.defect ? `Defeito: ${order.defect}` : null,
        order.totalValue ? `Total informado: R$ ${order.totalValue.toFixed(2)}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      const mergedNotes = [order.notes, notes]
        .filter((value): value is string => Boolean(value && value.trim()))
        .join(' | ');

      const result = await createOrder.mutateAsync({
        customerId,
        items: [],
        discount: 0,
        totalAmount: order.totalValue ?? 0,
        notes: mergedNotes || undefined,
        warrantyUntil: order.warrantyUntil?.toISOString(),
        devicePassword: order.devicePassword,
        warrantyTermIds: order.warrantyTermIds,
      });
      await ordersQuery.refetch();
      return result ? { orderNumber: result.orderNumber } : undefined;
    } catch (error) {
      console.error('Erro ao criar ordem:', error);
      return undefined;
    }
  };

  const updateOrder = async (id: string, updates: Partial<ServiceOrder>) => {
    try {
      await updateOrderMutation.mutateAsync({
        id,
        data: {
          notes: updates.notes,
          status: updates.status
            ? mapUiStatusToBackend(updates.status)
            : undefined,
        },
      });
      await ordersQuery.refetch();
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error);
    }
  };

  const updateOrderStatus = async (id: string, newStatus: ServiceOrder['status'], notes?: string) => {
    try {
      await updateOrderMutation.mutateAsync({
        id,
        data: {
          status: mapUiStatusToBackend(newStatus),
          notes,
        },
      });
      await ordersQuery.refetch();
    } catch (error) {
      console.error('Erro ao atualizar status da ordem:', error);
    }
  };

  const confirmPayment = async (
    orderId: string,
    payment: { method: string; installments: number; feeAmount: number; netValue: number; feePercent?: number }
  ) => {
    try {
      await confirmPaymentMutation.mutateAsync({
        id: orderId,
        payment: {
          ...payment,
          date: new Date().toISOString(),
        },
      });
      await ordersQuery.refetch();
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error);
      throw error;
    }
  };

  const getOrderById = (id: string) => {
    return orders.find((order) => order.id === id);
  };

  const cancelOrder = async (id: string) => {
    try {
      await cancelOrderMutation.mutateAsync({ id });
      await ordersQuery.refetch();
    } catch (error) {
      console.error('Erro ao cancelar ordem:', error);
      throw error;
    }
  };

  return (
    <OrdersContext.Provider value={{ orders, addOrder, updateOrder, updateOrderStatus, confirmPayment, cancelOrder, getOrderById }}>
      {children}
    </OrdersContext.Provider>
  );
}

function mapUiStatusToBackend(status: ServiceOrder['status']) {
  switch (status) {
    case 'NA BANCADA':
      return 'pending';
    case 'Em Reparo':
      return 'preparing';
    case 'Pronto':
      return 'ready';
    case 'Entregue':
      return 'delivered';
    case 'Cancelado':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function extractCustomerId(rawValue: string) {
  if (!rawValue) return undefined;
  const digits = rawValue.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits;
  }
  return undefined;
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders deve ser usado dentro de OrdersProvider');
  }
  return context;
}
