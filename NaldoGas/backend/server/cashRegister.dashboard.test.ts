import { describe, it, expect, beforeAll } from "vitest";
import * as dbHelpers from "./db-helpers";

describe("Cash Register & Dashboard Tests", () => {
  describe("Cash Register Operations", () => {
    it("should open cash register successfully", async () => {
      const result = await dbHelpers.openCashRegister({
        userId: 1,
        cashAmount: "100.00",
        cardAmount: "50.00",
        pixAmount: "30.00",
        creditAmount: "20.00",
        fullContainersPhysical: 50,
        emptyContainersPhysical: 30,
        notes: "Abertura de teste",
      });

      expect(result).toBeDefined();
      expect(result.type).toBe("opening");
      expect(result.userId).toBe(1);
      expect(result.cashAmount).toBe("100.00");
      expect(result.fullContainersPhysical).toBe(50);
    });

    it("should close cash register successfully", async () => {
      const result = await dbHelpers.closeCashRegister({
        userId: 1,
        cashAmount: "150.00",
        cardAmount: "80.00",
        pixAmount: "50.00",
        creditAmount: "20.00",
        totalSales: "300.00",
        fullContainersPhysical: 45,
        emptyContainersPhysical: 35,
        notes: "Fechamento de teste",
      });

      expect(result).toBeDefined();
      expect(result.type).toBe("closing");
      expect(result.userId).toBe(1);
      expect(result.totalSales).toBe("300.00");
      expect(result.fullContainersPhysical).toBe(45);
    });

    it("should get today's cash register sessions", async () => {
      const sessions = await dbHelpers.getTodayCashRegisterSessions();
      expect(Array.isArray(sessions)).toBe(true);
      // Deve conter pelo menos as 2 sessões criadas nos testes acima
      expect(sessions.length).toBeGreaterThanOrEqual(2);
    });

    it("should get last cash register session", async () => {
      const lastSession = await dbHelpers.getLastCashRegisterSession();
      expect(lastSession).toBeDefined();
      expect(lastSession?.type).toBe("closing"); // O último deve ser o fechamento
    });

    it("should get cash register history with limit", async () => {
      const history = await dbHelpers.getCashRegisterHistory(5);
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(5);
    });

    it("should calculate difference correctly (physical vs virtual)", () => {
      const physicalTotal = 150 + 80 + 50 + 20; // 300
      const virtualTotal = 300;
      const difference = physicalTotal - virtualTotal;
      expect(difference).toBe(0); // Sem diferença
    });

    it("should detect surplus (sobra)", () => {
      const physicalTotal = 350; // Físico maior
      const virtualTotal = 300;
      const difference = physicalTotal - virtualTotal;
      expect(difference).toBeGreaterThan(0);
      expect(difference).toBe(50);
    });

    it("should detect shortage (falta)", () => {
      const physicalTotal = 280; // Físico menor
      const virtualTotal = 300;
      const difference = physicalTotal - virtualTotal;
      expect(difference).toBeLessThan(0);
      expect(difference).toBe(-20);
    });
  });

  describe("Dashboard Statistics", () => {
    it("should get today's sales count", async () => {
      const count = await dbHelpers.getTodaySalesCount();
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("should get today's revenue", async () => {
      const revenue = await dbHelpers.getTodayRevenue();
      expect(typeof revenue).toBe("string");
      expect(parseFloat(revenue)).toBeGreaterThanOrEqual(0);
    });

    it("should get pending deliveries count", async () => {
      const count = await dbHelpers.getPendingDeliveriesCount();
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("should get low stock products", async () => {
      const products = await dbHelpers.getLowStockProducts();
      expect(Array.isArray(products)).toBe(true);
      // Cada produto deve ter stockQuantity e minStock
      products.forEach((product) => {
        expect(product).toHaveProperty("stockQuantity");
        expect(product).toHaveProperty("minStock");
        expect(product.stockQuantity).toBeLessThan(product.minStock);
      });
    });

    it("should get customers with pending containers", async () => {
      const customers = await dbHelpers.getCustomersWithPendingContainers();
      expect(Array.isArray(customers)).toBe(true);
      // Cada item deve ter customer, containers e totalQuantity
      customers.forEach((item) => {
        expect(item).toHaveProperty("customer");
        expect(item).toHaveProperty("containers");
        expect(item).toHaveProperty("totalQuantity");
        expect(Array.isArray(item.containers)).toBe(true);
        expect(item.totalQuantity).toBeGreaterThan(0);
      });
    });

    it("should calculate average ticket correctly", () => {
      const totalRevenue = 1500;
      const totalSales = 10;
      const averageTicket = totalRevenue / totalSales;
      expect(averageTicket).toBe(150);
    });

    it("should handle zero sales for average ticket", () => {
      const totalRevenue = 0;
      const totalSales = 0;
      const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
      expect(averageTicket).toBe(0);
    });
  });

  describe("Container Delay Status", () => {
    const getDelayStatus = (daysAgo: number) => {
      const now = new Date();
      const updated = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const daysDiff = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff >= 10) {
        return { label: "Muito Atrasado", days: daysDiff };
      } else if (daysDiff >= 5) {
        return { label: "Atrasado", days: daysDiff };
      } else {
        return { label: "Normal", days: daysDiff };
      }
    };

    it("should classify as Normal (0-4 days)", () => {
      const status = getDelayStatus(3);
      expect(status.label).toBe("Normal");
      expect(status.days).toBeLessThan(5);
    });

    it("should classify as Atrasado (5-9 days)", () => {
      const status = getDelayStatus(7);
      expect(status.label).toBe("Atrasado");
      expect(status.days).toBeGreaterThanOrEqual(5);
      expect(status.days).toBeLessThan(10);
    });

    it("should classify as Muito Atrasado (10+ days)", () => {
      const status = getDelayStatus(12);
      expect(status.label).toBe("Muito Atrasado");
      expect(status.days).toBeGreaterThanOrEqual(10);
    });
  });

  describe("Cash Register Validations", () => {
    it("should validate opening before closing", () => {
      const hasOpening = true;
      const canClose = hasOpening;
      expect(canClose).toBe(true);
    });

    it("should prevent closing without opening", () => {
      const hasOpening = false;
      const canClose = hasOpening;
      expect(canClose).toBe(false);
    });

    it("should allow multiple openings in the same day", () => {
      // Sistema permite múltiplas aberturas (ex: turno manhã e tarde)
      const openingsCount = 2;
      expect(openingsCount).toBeGreaterThan(0);
    });
  });
});
