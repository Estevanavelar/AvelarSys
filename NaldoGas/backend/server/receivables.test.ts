import { describe, it, expect, beforeEach } from "vitest";

/**
 * Testes unitários para o módulo de Fiados (Contas a Receber)
 * Validam a lógica de criação, pagamento e rastreamento de fiados
 */

interface Receivable {
  id: number;
  customerId: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: "pending" | "partial" | "paid";
  createdDate: Date;
  dueDate: Date;
  notes?: string;
}

interface Payment {
  id: number;
  receivableId: number;
  amount: number;
  paymentDate: Date;
  method: "cash" | "check" | "transfer";
  notes?: string;
}

// Função para criar fiado
function createReceivable(
  customerId: number,
  totalAmount: number,
  dueDate: Date,
  notes?: string
): Receivable {
  if (totalAmount <= 0) {
    throw new Error("Valor deve ser maior que zero");
  }

  return {
    id: Math.random(),
    customerId,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    paidAmount: 0,
    pendingAmount: parseFloat(totalAmount.toFixed(2)),
    status: "pending",
    createdDate: new Date(),
    dueDate,
    notes,
  };
}

// Função para registrar pagamento
function registerPayment(receivable: Receivable, amount: number, method: "cash" | "check" | "transfer"): Receivable {
  if (amount <= 0) {
    throw new Error("Valor de pagamento deve ser maior que zero");
  }

  if (amount > receivable.pendingAmount) {
    throw new Error("Valor de pagamento excede o saldo devedor");
  }

  const newPaidAmount = parseFloat((receivable.paidAmount + amount).toFixed(2));
  const newPendingAmount = parseFloat((receivable.totalAmount - newPaidAmount).toFixed(2));

  let status: "pending" | "partial" | "paid" = "pending";
  if (newPendingAmount === 0) {
    status = "paid";
  } else if (newPaidAmount > 0) {
    status = "partial";
  }

  return {
    ...receivable,
    paidAmount: newPaidAmount,
    pendingAmount: newPendingAmount,
    status,
  };
}

// Função para verificar se está vencido
function isOverdue(receivable: Receivable): boolean {
  return receivable.status !== "paid" && new Date() > receivable.dueDate;
}

// Função para calcular dias até vencimento
function daysUntilDue(receivable: Receivable): number {
  const now = new Date();
  const diffTime = receivable.dueDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Função para gerar relatório de fiados
function generateReceivablesReport(receivables: Receivable[]): {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  overdueCount: number;
  averagePaymentDays: number;
} {
  const totalAmount = receivables.reduce((sum, r) => sum + r.totalAmount, 0);
  const paidAmount = receivables.reduce((sum, r) => sum + r.paidAmount, 0);
  const pendingAmount = receivables.reduce((sum, r) => sum + r.pendingAmount, 0);

  const overdueReceivables = receivables.filter((r) => isOverdue(r));
  const overdueAmount = overdueReceivables.reduce((sum, r) => sum + r.pendingAmount, 0);
  const overdueCount = overdueReceivables.length;

  const paidReceivables = receivables.filter((r) => r.status === "paid");
  const averagePaymentDays =
    paidReceivables.length > 0
      ? Math.round(
          paidReceivables.reduce((sum, r) => {
            const days = Math.floor((r.dueDate.getTime() - r.createdDate.getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0) / paidReceivables.length
        )
      : 0;

  return {
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    paidAmount: parseFloat(paidAmount.toFixed(2)),
    pendingAmount: parseFloat(pendingAmount.toFixed(2)),
    overdueAmount: parseFloat(overdueAmount.toFixed(2)),
    overdueCount,
    averagePaymentDays,
  };
}

// Testes
describe("Fiados - Contas a Receber", () => {
  let receivable: Receivable;
  const customerId = 1;
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

  beforeEach(() => {
    receivable = createReceivable(customerId, 500, dueDate, "Venda de GLP");
  });

  describe("Criação de Fiado", () => {
    it("deve criar fiado com valores corretos", () => {
      expect(receivable.customerId).toBe(customerId);
      expect(receivable.totalAmount).toBe(500);
      expect(receivable.paidAmount).toBe(0);
      expect(receivable.pendingAmount).toBe(500);
      expect(receivable.status).toBe("pending");
    });

    it("deve lançar erro para valor inválido", () => {
      expect(() => createReceivable(customerId, 0, dueDate)).toThrow("Valor deve ser maior que zero");
      expect(() => createReceivable(customerId, -100, dueDate)).toThrow("Valor deve ser maior que zero");
    });

    it("deve arredondar valores corretamente", () => {
      const receivable = createReceivable(customerId, 123.456, dueDate);
      expect(receivable.totalAmount).toBe(123.46);
      expect(receivable.pendingAmount).toBe(123.46);
    });
  });

  describe("Pagamentos", () => {
    it("deve registrar pagamento total", () => {
      const updated = registerPayment(receivable, 500, "cash");

      expect(updated.paidAmount).toBe(500);
      expect(updated.pendingAmount).toBe(0);
      expect(updated.status).toBe("paid");
    });

    it("deve registrar pagamento parcial", () => {
      const updated = registerPayment(receivable, 200, "cash");

      expect(updated.paidAmount).toBe(200);
      expect(updated.pendingAmount).toBe(300);
      expect(updated.status).toBe("partial");
    });

    it("deve permitir múltiplos pagamentos", () => {
      let updated = registerPayment(receivable, 200, "cash");
      updated = registerPayment(updated, 150, "check");
      updated = registerPayment(updated, 150, "transfer");

      expect(updated.paidAmount).toBe(500);
      expect(updated.pendingAmount).toBe(0);
      expect(updated.status).toBe("paid");
    });

    it("deve lançar erro para pagamento inválido", () => {
      expect(() => registerPayment(receivable, 0, "cash")).toThrow("Valor de pagamento deve ser maior que zero");
      expect(() => registerPayment(receivable, -50, "cash")).toThrow("Valor de pagamento deve ser maior que zero");
      expect(() => registerPayment(receivable, 600, "cash")).toThrow("Valor de pagamento excede o saldo devedor");
    });

    it("deve arredondar valores de pagamento", () => {
      const updated = registerPayment(receivable, 123.456, "cash");

      expect(updated.paidAmount).toBe(123.46);
      expect(updated.pendingAmount).toBe(parseFloat((500 - 123.46).toFixed(2)));
    });
  });

  describe("Vencimento", () => {
    it("deve identificar fiado vencido", () => {
      const overdueDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 dias atrás
      const overdueReceivable = createReceivable(customerId, 500, overdueDate);

      expect(isOverdue(overdueReceivable)).toBe(true);
    });

    it("deve identificar fiado não vencido", () => {
      expect(isOverdue(receivable)).toBe(false);
    });

    it("deve calcular dias até vencimento", () => {
      const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      const futureReceivable = createReceivable(customerId, 500, futureDate);

      const days = daysUntilDue(futureReceivable);
      expect(days).toBeGreaterThanOrEqual(14);
      expect(days).toBeLessThanOrEqual(15);
    });

    it("deve retornar dias negativos para fiado vencido", () => {
      const overdueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const overdueReceivable = createReceivable(customerId, 500, overdueDate);

      const days = daysUntilDue(overdueReceivable);
      expect(days).toBeLessThan(0);
    });
  });

  describe("Relatórios", () => {
    it("deve gerar relatório de fiados vazios", () => {
      const report = generateReceivablesReport([]);

      expect(report.totalAmount).toBe(0);
      expect(report.paidAmount).toBe(0);
      expect(report.pendingAmount).toBe(0);
      expect(report.overdueAmount).toBe(0);
      expect(report.overdueCount).toBe(0);
    });

    it("deve gerar relatório com múltiplos fiados", () => {
      const receivables = [
        createReceivable(1, 500, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        createReceivable(2, 300, new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)),
        createReceivable(3, 200, new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)), // Vencido
      ];

      const report = generateReceivablesReport(receivables);

      expect(report.totalAmount).toBe(1000);
      expect(report.pendingAmount).toBe(1000);
      expect(report.overdueCount).toBe(1);
      expect(report.overdueAmount).toBe(200);
    });

    it("deve calcular corretamente com pagamentos", () => {
      let receivable1 = createReceivable(1, 500, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      receivable1 = registerPayment(receivable1, 200, "cash");

      let receivable2 = createReceivable(2, 300, new Date(Date.now() + 15 * 24 * 60 * 60 * 1000));
      receivable2 = registerPayment(receivable2, 300, "cash");

      const report = generateReceivablesReport([receivable1, receivable2]);

      expect(report.totalAmount).toBe(800);
      expect(report.paidAmount).toBe(500);
      expect(report.pendingAmount).toBe(300);
    });
  });

  describe("Casos de Uso Reais", () => {
    it("deve processar fluxo completo de fiado", () => {
      // Cliente compra a prazo
      let receivable = createReceivable(1, 1000, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "Compra de GLP");

      expect(receivable.status).toBe("pending");
      expect(isOverdue(receivable)).toBe(false);

      // Cliente paga parcialmente
      receivable = registerPayment(receivable, 400, "cash");
      expect(receivable.status).toBe("partial");
      expect(receivable.pendingAmount).toBe(600);

      // Cliente paga o restante
      receivable = registerPayment(receivable, 600, "transfer");
      expect(receivable.status).toBe("paid");
      expect(receivable.pendingAmount).toBe(0);
    });

    it("deve gerar relatório de cobrança", () => {
      const receivables = [
        createReceivable(1, 500, new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)), // Vencido
        createReceivable(2, 300, new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)), // Vencido
        createReceivable(3, 200, new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)), // Não vencido
      ];

      const report = generateReceivablesReport(receivables);

      expect(report.overdueCount).toBe(2);
      expect(report.overdueAmount).toBe(800);
      expect(report.pendingAmount).toBe(1000);
    });
  });
});
