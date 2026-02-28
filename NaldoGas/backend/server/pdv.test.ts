import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Testes unitários para o módulo de PDV (Ponto de Venda)
 * Validam a lógica de carrinho, cálculo de totais e criação de vendas
 */

// Mock de produto
interface Product {
  id: number;
  name: string;
  salePrice: string;
  costPrice: string;
}

// Mock de item do carrinho
interface CartItem {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// Função para calcular subtotal
function calculateSubtotal(unitPrice: number, quantity: number): number {
  return parseFloat((unitPrice * quantity).toFixed(2));
}

// Função para calcular total do carrinho
function calculateCartTotal(items: CartItem[], discount: number = 0): number {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  return parseFloat((subtotal - discount).toFixed(2));
}

// Função para validar quantidade
function validateQuantity(quantity: number): boolean {
  return quantity > 0 && Number.isInteger(quantity);
}

// Função para validar preço
function validatePrice(price: number): boolean {
  return price > 0 && price <= 999999.99;
}

// Função para adicionar item ao carrinho
function addToCart(cart: CartItem[], product: Product, quantity: number): CartItem[] {
  if (!validateQuantity(quantity)) {
    throw new Error("Quantidade inválida");
  }

  const unitPrice = parseFloat(product.salePrice);
  if (!validatePrice(unitPrice)) {
    throw new Error("Preço inválido");
  }

  const existingItem = cart.find((item) => item.productId === product.id);

  if (existingItem) {
    return cart.map((item) =>
      item.productId === product.id
        ? {
            ...item,
            quantity: item.quantity + quantity,
            subtotal: calculateSubtotal(item.unitPrice, item.quantity + quantity),
          }
        : item
    );
  }

  return [
    ...cart,
    {
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice,
      subtotal: calculateSubtotal(unitPrice, quantity),
    },
  ];
}

// Função para remover item do carrinho
function removeFromCart(cart: CartItem[], productId: number): CartItem[] {
  return cart.filter((item) => item.productId !== productId);
}

// Função para atualizar quantidade
function updateQuantity(cart: CartItem[], productId: number, quantity: number): CartItem[] {
  if (!validateQuantity(quantity)) {
    throw new Error("Quantidade inválida");
  }

  return cart.map((item) =>
    item.productId === productId
      ? {
          ...item,
          quantity,
          subtotal: calculateSubtotal(item.unitPrice, quantity),
        }
      : item
  );
}

// Testes
describe("PDV - Ponto de Venda", () => {
  let mockProducts: Product[];
  let cart: CartItem[];

  beforeEach(() => {
    mockProducts = [
      {
        id: 1,
        name: "GLP 13Kg",
        salePrice: "100.00",
        costPrice: "60.00",
      },
      {
        id: 2,
        name: "Água 20L",
        salePrice: "8.50",
        costPrice: "4.00",
      },
      {
        id: 3,
        name: "Acessório",
        salePrice: "25.00",
        costPrice: "12.00",
      },
    ];
    cart = [];
  });

  describe("Validações", () => {
    it("deve validar quantidade positiva", () => {
      expect(validateQuantity(1)).toBe(true);
      expect(validateQuantity(100)).toBe(true);
      expect(validateQuantity(0)).toBe(false);
      expect(validateQuantity(-1)).toBe(false);
      expect(validateQuantity(1.5)).toBe(false);
    });

    it("deve validar preço válido", () => {
      expect(validatePrice(0.01)).toBe(true);
      expect(validatePrice(100)).toBe(true);
      expect(validatePrice(999999.99)).toBe(true);
      expect(validatePrice(0)).toBe(false);
      expect(validatePrice(-10)).toBe(false);
      expect(validatePrice(1000000)).toBe(false);
    });
  });

  describe("Cálculos", () => {
    it("deve calcular subtotal corretamente", () => {
      expect(calculateSubtotal(100, 1)).toBe(100);
      expect(calculateSubtotal(100, 2)).toBe(200);
      expect(calculateSubtotal(8.5, 3)).toBe(25.5);
      expect(calculateSubtotal(25.99, 2)).toBe(51.98);
    });

    it("deve calcular total do carrinho sem desconto", () => {
      const items: CartItem[] = [
        { productId: 1, name: "GLP 13Kg", quantity: 1, unitPrice: 100, subtotal: 100 },
        { productId: 2, name: "Água 20L", quantity: 2, unitPrice: 8.5, subtotal: 17 },
      ];

      expect(calculateCartTotal(items)).toBe(117);
    });

    it("deve calcular total do carrinho com desconto", () => {
      const items: CartItem[] = [
        { productId: 1, name: "GLP 13Kg", quantity: 1, unitPrice: 100, subtotal: 100 },
        { productId: 2, name: "Água 20L", quantity: 2, unitPrice: 8.5, subtotal: 17 },
      ];

      expect(calculateCartTotal(items, 10)).toBe(107);
      expect(calculateCartTotal(items, 117)).toBe(0);
    });

    it("deve arredondar valores corretamente", () => {
      const items: CartItem[] = [
        { productId: 1, name: "GLP 13Kg", quantity: 1, unitPrice: 10.99, subtotal: 10.99 },
        { productId: 2, name: "Água 20L", quantity: 1, unitPrice: 8.5, subtotal: 8.5 },
      ];

      const total = calculateCartTotal(items, 0.49);
      expect(total).toBe(19);
    });
  });

  describe("Operações do Carrinho", () => {
    it("deve adicionar item ao carrinho vazio", () => {
      const product = mockProducts[0];
      const newCart = addToCart(cart, product, 1);

      expect(newCart).toHaveLength(1);
      expect(newCart[0]).toMatchObject({
        productId: 1,
        name: "GLP 13Kg",
        quantity: 1,
        unitPrice: 100,
        subtotal: 100,
      });
    });

    it("deve adicionar múltiplos itens diferentes", () => {
      let newCart = addToCart(cart, mockProducts[0], 1);
      newCart = addToCart(newCart, mockProducts[1], 2);
      newCart = addToCart(newCart, mockProducts[2], 1);

      expect(newCart).toHaveLength(3);
      // GLP 13Kg (1x100) + Água 20L (2x8.5) + Acessório (1x25) = 100 + 17 + 25 = 142
      expect(calculateCartTotal(newCart)).toBe(142);
    });

    it("deve incrementar quantidade de item existente", () => {
      let newCart = addToCart(cart, mockProducts[0], 1);
      newCart = addToCart(newCart, mockProducts[0], 2);

      expect(newCart).toHaveLength(1);
      expect(newCart[0].quantity).toBe(3);
      expect(newCart[0].subtotal).toBe(300);
    });

    it("deve remover item do carrinho", () => {
      let newCart = addToCart(cart, mockProducts[0], 1);
      newCart = addToCart(newCart, mockProducts[1], 2);

      expect(newCart).toHaveLength(2);

      newCart = removeFromCart(newCart, mockProducts[0].id);
      expect(newCart).toHaveLength(1);
      expect(newCart[0].productId).toBe(2);
    });

    it("deve atualizar quantidade de item", () => {
      let newCart = addToCart(cart, mockProducts[0], 1);
      newCart = updateQuantity(newCart, mockProducts[0].id, 5);

      expect(newCart[0].quantity).toBe(5);
      expect(newCart[0].subtotal).toBe(500);
    });

    it("deve lançar erro ao adicionar quantidade inválida", () => {
      expect(() => addToCart(cart, mockProducts[0], 0)).toThrow("Quantidade inválida");
      expect(() => addToCart(cart, mockProducts[0], -1)).toThrow("Quantidade inválida");
      expect(() => addToCart(cart, mockProducts[0], 1.5)).toThrow("Quantidade inválida");
    });
  });

  describe("Casos de Uso Reais", () => {
    it("deve processar uma venda completa", () => {
      // Cliente compra 2x GLP 13Kg e 3x Água 20L
      let newCart = addToCart(cart, mockProducts[0], 2);
      newCart = addToCart(newCart, mockProducts[1], 3);

      expect(newCart).toHaveLength(2);
      expect(calculateCartTotal(newCart)).toBe(225.5);

      // Aplicar desconto de R$ 10
      const finalTotal = calculateCartTotal(newCart, 10);
      expect(finalTotal).toBe(215.5);
    });

    it("deve permitir modificações no carrinho", () => {
      let newCart = addToCart(cart, mockProducts[0], 1);
      newCart = addToCart(newCart, mockProducts[1], 2);

      // Cliente muda de ideia e quer 3x Água
      newCart = updateQuantity(newCart, mockProducts[1].id, 3);
      expect(newCart[1].subtotal).toBe(25.5);

      // Remove GLP
      newCart = removeFromCart(newCart, mockProducts[0].id);
      expect(newCart).toHaveLength(1);
      expect(calculateCartTotal(newCart)).toBe(25.5);
    });

    it("deve calcular margem de lucro", () => {
      const product = mockProducts[0];
      const salePrice = parseFloat(product.salePrice);
      const costPrice = parseFloat(product.costPrice);
      const margin = ((salePrice - costPrice) / salePrice) * 100;

      expect(margin).toBeCloseTo(40, 1); // 40% de margem
    });
  });
});
