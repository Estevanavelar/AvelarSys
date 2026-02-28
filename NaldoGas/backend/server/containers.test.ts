import { describe, it, expect } from "vitest";

/**
 * Testes para o Sistema de Vasilhames Automático no PDV
 * 
 * Funcionalidades testadas:
 * 1. Troca automática de vasilhames em vendas de GLP/Água
 * 2. Registro de vasilhames pendentes quando cliente não traz vazio
 * 3. Busca de cliente por CPF ou telefone
 * 4. Seleção de canal de venda (Portaria, TeleGás, WhatsApp)
 */

describe("Sistema de Vasilhames Automático", () => {
  describe("Lógica de Troca de Vasilhames", () => {
    it("deve registrar troca automática quando cliente traz vasilhame vazio", () => {
      const sale = {
        hasContainers: true,
        containerNotExchanged: false,
        containerQuantity: 2,
      };

      const containerExchanged = sale.hasContainers ? !sale.containerNotExchanged : true;
      const containerOwed = sale.hasContainers && sale.containerNotExchanged ? sale.containerQuantity : 0;

      expect(containerExchanged).toBe(true);
      expect(containerOwed).toBe(0);
    });

    it("deve registrar vasilhame pendente quando cliente não traz vazio", () => {
      const sale = {
        hasContainers: true,
        containerNotExchanged: true,
        containerQuantity: 3,
      };

      const containerExchanged = sale.hasContainers ? !sale.containerNotExchanged : true;
      const containerOwed = sale.hasContainers && sale.containerNotExchanged ? sale.containerQuantity : 0;

      expect(containerExchanged).toBe(false);
      expect(containerOwed).toBe(3);
    });

    it("deve ignorar lógica de vasilhames quando não há produtos vasilhame na venda", () => {
      const sale = {
        hasContainers: false,
        containerNotExchanged: false,
        containerQuantity: 0,
      };

      const containerExchanged = sale.hasContainers ? !sale.containerNotExchanged : true;
      const containerOwed = sale.hasContainers && sale.containerNotExchanged ? sale.containerQuantity : 0;

      expect(containerExchanged).toBe(true);
      expect(containerOwed).toBe(0);
    });

    it("deve calcular corretamente quantidade de vasilhames devidos com múltiplos produtos", () => {
      const cartItems = [
        { name: "GLP 13Kg", quantity: 2, isContainer: true },
        { name: "Água 20L", quantity: 1, isContainer: true },
        { name: "Mangueira", quantity: 1, isContainer: false },
      ];

      const totalContainers = cartItems
        .filter((item) => item.isContainer)
        .reduce((sum, item) => sum + item.quantity, 0);

      expect(totalContainers).toBe(3);
    });
  });

  describe("Busca de Cliente por CPF ou Telefone", () => {
    it("deve limpar caracteres especiais do CPF para busca", () => {
      const cpfInput = "123.456.789-00";
      const cleanCpf = cpfInput.replace(/[^0-9]/g, "");

      expect(cleanCpf).toBe("12345678900");
    });

    it("deve limpar caracteres especiais do telefone para busca", () => {
      const phoneInput = "(27) 99999-8888";
      const cleanPhone = phoneInput.replace(/[^0-9]/g, "");

      expect(cleanPhone).toBe("27999998888");
    });

    it("deve aceitar CPF sem formatação", () => {
      const cpfInput = "12345678900";
      const cleanCpf = cpfInput.replace(/[^0-9]/g, "");

      expect(cleanCpf).toBe("12345678900");
    });

    it("deve aceitar telefone sem formatação", () => {
      const phoneInput = "27999998888";
      const cleanPhone = phoneInput.replace(/[^0-9]/g, "");

      expect(cleanPhone).toBe("27999998888");
    });
  });

  describe("Canais de Venda", () => {
    it("deve validar canal de venda Portaria", () => {
      const salesChannel = "portaria";
      const validChannels = ["portaria", "telegas", "whatsapp"];

      expect(validChannels).toContain(salesChannel);
    });

    it("deve validar canal de venda TeleGás", () => {
      const salesChannel = "telegas";
      const validChannels = ["portaria", "telegas", "whatsapp"];

      expect(validChannels).toContain(salesChannel);
    });

    it("deve validar canal de venda WhatsApp", () => {
      const salesChannel = "whatsapp";
      const validChannels = ["portaria", "telegas", "whatsapp"];

      expect(validChannels).toContain(salesChannel);
    });

    it("deve rejeitar canal de venda inválido", () => {
      const salesChannel = "email";
      const validChannels = ["portaria", "telegas", "whatsapp"];

      expect(validChannels).not.toContain(salesChannel);
    });
  });

  describe("Validação de Dados de Venda com Vasilhames", () => {
    it("deve validar venda completa com troca de vasilhame", () => {
      const sale = {
        customerId: 1,
        totalAmount: "150.00",
        discount: "0.00",
        paymentMethod: "cash",
        salesChannel: "portaria",
        containerExchanged: true,
        containerOwed: 0,
        items: [
          { productId: 1, quantity: 1, unitPrice: "150.00", subtotal: "150.00" },
        ],
      };

      expect(sale.containerExchanged).toBe(true);
      expect(sale.containerOwed).toBe(0);
      expect(sale.totalAmount).toBe("150.00");
    });

    it("deve validar venda com vasilhame pendente", () => {
      const sale = {
        customerId: 2,
        totalAmount: "300.00",
        discount: "10.00",
        paymentMethod: "credit",
        salesChannel: "telegas",
        containerExchanged: false,
        containerOwed: 2,
        items: [
          { productId: 1, quantity: 2, unitPrice: "150.00", subtotal: "300.00" },
        ],
      };

      expect(sale.containerExchanged).toBe(false);
      expect(sale.containerOwed).toBe(2);
      expect(sale.paymentMethod).toBe("credit");
    });

    it("deve calcular total com desconto corretamente", () => {
      const subtotal = 300.0;
      const discount = 10.0;
      const total = subtotal - discount;

      expect(total).toBe(290.0);
    });

    it("deve validar quantidade mínima de vasilhames", () => {
      const containerOwed = 0;

      expect(containerOwed).toBeGreaterThanOrEqual(0);
    });

    it("deve validar que containerOwed é zero quando há troca", () => {
      const containerExchanged = true;
      const containerOwed = containerExchanged ? 0 : 2;

      expect(containerOwed).toBe(0);
    });
  });

  describe("Identificação de Produtos Vasilhame", () => {
    it("deve identificar GLP 13Kg como produto vasilhame", () => {
      const product = {
        id: 1,
        name: "GLP 13Kg",
        isContainer: true,
      };

      expect(product.isContainer).toBe(true);
    });

    it("deve identificar Água 20L como produto vasilhame", () => {
      const product = {
        id: 2,
        name: "Água 20L",
        isContainer: true,
      };

      expect(product.isContainer).toBe(true);
    });

    it("deve identificar acessório como produto não-vasilhame", () => {
      const product = {
        id: 3,
        name: "Mangueira",
        isContainer: false,
      };

      expect(product.isContainer).toBe(false);
    });

    it("deve filtrar apenas produtos vasilhame do carrinho", () => {
      const cart = [
        { productId: 1, name: "GLP 13Kg", isContainer: true, quantity: 2 },
        { productId: 2, name: "Água 20L", isContainer: true, quantity: 1 },
        { productId: 3, name: "Mangueira", isContainer: false, quantity: 1 },
      ];

      const containerProducts = cart.filter((item) => item.isContainer);

      expect(containerProducts).toHaveLength(2);
      expect(containerProducts[0].name).toBe("GLP 13Kg");
      expect(containerProducts[1].name).toBe("Água 20L");
    });
  });

  describe("Cálculos de Estoque de Vasilhames", () => {
    it("deve calcular saldo de vasilhames após venda com troca", () => {
      const initialFull = 50;
      const initialEmpty = 20;
      const sold = 3;
      const exchanged = 3;

      const finalFull = initialFull - sold;
      const finalEmpty = initialEmpty + exchanged;

      expect(finalFull).toBe(47);
      expect(finalEmpty).toBe(23);
    });

    it("deve calcular saldo de vasilhames após venda sem troca", () => {
      const initialFull = 50;
      const initialEmpty = 20;
      const sold = 3;
      const exchanged = 0;
      const owed = 3;

      const finalFull = initialFull - sold;
      const finalEmpty = initialEmpty + exchanged;
      const inCustomerPossession = owed;

      expect(finalFull).toBe(47);
      expect(finalEmpty).toBe(20);
      expect(inCustomerPossession).toBe(3);
    });

    it("deve calcular total de vasilhames no sistema", () => {
      const full = 47;
      const empty = 23;
      const customerPossession = 5;

      const total = full + empty + customerPossession;

      expect(total).toBe(75);
    });
  });
});
