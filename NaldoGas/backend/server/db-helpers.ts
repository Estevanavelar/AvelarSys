import { eq, and, or, desc, gte, lte, gt, sql } from "drizzle-orm";
import {
  products,
  inventory,
  customers,
  sales,
  saleItems,
  receivables,
  payables,
  pendingSales,
  containers,
  whatsappConfig,
  whatsappMessageTemplates,
  whatsappNotificationHistory,
  cashRegister,
  coupons,
  publicCustomers,
  publicOrders,
  catalogSettings,
  deliverers,
  type InsertProduct,
  type InsertCustomer,
  type InsertSale,
  type InsertSaleItem,
  type InsertReceivable,
  type InsertPayable,
  type InsertPendingSale,
  type InsertWhatsappConfig,
  type InsertWhatsappMessageTemplate,
  type InsertWhatsappNotificationHistory,
} from "../drizzle/schema";
import { getDb } from "./db";

/**
 * PRODUTOS
 */
export async function createProduct(product: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(products).values(product).returning();
  return result[0];
}

export async function getProducts() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(products);
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(products).where(eq(products.id, id));
  return result[0];
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(products)
    .set(data)
    .where(eq(products.id, id))
    .returning();
  return result[0];
}

/**
 * ESTOQUE
 */
export async function getInventory() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(inventory);
}

export async function getInventoryByProductId(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(inventory)
    .where(eq(inventory.productId, productId));
  return result[0];
}

export async function updateInventoryQuantity(productId: number, quantity: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(inventory)
    .set({ quantity, updatedAt: new Date() })
    .where(eq(inventory.productId, productId))
    .returning();
  return result[0];
}

/**
 * CLIENTES
 */
export async function createCustomer(customer: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(customer).returning();
  return result[0];
}

export async function getCustomers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(customers);
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(customers).where(eq(customers.id, id));
  return result[0];
}

export async function getCustomerByCPF(cpf: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(customers).where(eq(customers.cpf, cpf));
  return result[0];
}

export async function getCustomerByPhone(phone: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(customers).where(eq(customers.phone, phone));
  return result[0];
}

export async function searchCustomers(query: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Busca por nome ou telefone (implementar com like ou similar)
  return db.select().from(customers);
}

export async function searchCustomerByPhoneOrCpf(search: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Remove caracteres especiais para busca
  const cleanSearch = search.replace(/[^0-9]/g, "");
  
  // Busca por CPF ou telefone
  const result = await db
    .select()
    .from(customers)
    .where(
      or(
        eq(customers.cpf, cleanSearch),
        eq(customers.phone, cleanSearch)
      )
    );
  
  return result[0] || null;
}

export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(customers)
    .set(data)
    .where(eq(customers.id, id))
    .returning();
  return result[0];
}

/**
 * VENDAS
 */
export async function createSale(sale: InsertSale) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sales).values(sale).returning();
  return result[0];
}

export async function getSaleById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(sales).where(eq(sales.id, id));
  return result[0];
}

export async function getSalesByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(sales)
    .where(and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate)))
    .orderBy(desc(sales.createdAt));
}

/**
 * ITENS DE VENDA
 */
export async function createSaleItem(item: InsertSaleItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(saleItems).values(item).returning();
  return result[0];
}

export async function getSaleItems(saleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
}

/**
 * CONTAS A RECEBER (FIADOS)
 */
export async function createReceivable(receivable: InsertReceivable) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(receivables).values(receivable).returning();
  return result[0];
}

export async function getReceivablesByCustomerId(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(receivables)
    .where(eq(receivables.customerId, customerId));
}

export async function getReceivablesByStatus(status: "pending" | "partial" | "paid" | "overdue") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(receivables).where(eq(receivables.status, status));
}

export async function updateReceivable(id: number, data: Partial<InsertReceivable>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(receivables)
    .set(data)
    .where(eq(receivables.id, id))
    .returning();
  return result[0];
}

/**
 * CONTAS A PAGAR
 */
export async function createPayable(payable: InsertPayable) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(payables).values(payable).returning();
  return result[0];
}

export async function getPayables() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(payables).orderBy(desc(payables.dueDate));
}

export async function getPayablesByStatus(status: "pending" | "paid") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(payables).where(eq(payables.status, status));
}

export async function updatePayable(id: number, data: Partial<InsertPayable>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(payables)
    .set(data)
    .where(eq(payables.id, id))
    .returning();
  return result[0];
}

/**
 * VENDAS PENDENTES
 */
export async function createPendingSale(pendingSale: InsertPendingSale) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(pendingSales).values(pendingSale).returning();
  return result[0];
}

export async function getPendingSalesByStatus(status: "pending" | "in_transit" | "delivered" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(pendingSales)
    .where(eq(pendingSales.status, status));
}

export async function getPendingSalesByDeliverer(delivererId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(pendingSales)
    .where(eq(pendingSales.delivererId, delivererId));
}

export async function updatePendingSale(id: number, data: Partial<InsertPendingSale>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(pendingSales)
    .set(data)
    .where(eq(pendingSales.id, id))
    .returning();
  return result[0];
}

/**
 * VASILHAMES
 */
export async function getContainers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(containers);
}

export async function getContainersByStatus(status: "full" | "empty" | "customer_possession") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(containers).where(eq(containers.status, status));
}

export async function updateContainerStatus(id: number, status: "full" | "empty" | "customer_possession", customerId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(containers)
    .set({ status, customerId, updatedAt: new Date() })
    .where(eq(containers.id, id))
    .returning();
  return result[0];
}


/**
 * CONFIGURAÇÃO DE WHATSAPP
 */
export async function getWhatsappConfig() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(whatsappConfig).limit(1);
  return result[0];
}

export async function updateWhatsappConfig(data: Partial<InsertWhatsappConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const config = await getWhatsappConfig();
  
  if (config) {
    const updateData: any = { ...data, updatedAt: new Date() };
    const result = await db
      .update(whatsappConfig)
      .set(updateData)
      .where(eq(whatsappConfig.id, config.id))
      .returning();
    return result[0];
  } else {
    const insertData: any = data;
    const result = await db.insert(whatsappConfig).values(insertData).returning();
    return result[0];
  }
}


/**
 * TEMPLATES DE MENSAGENS WHATSAPP
 */
export async function getWhatsappMessageTemplates() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(whatsappMessageTemplates).orderBy(desc(whatsappMessageTemplates.createdAt));
}

export async function getWhatsappMessageTemplateByType(templateType: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(whatsappMessageTemplates)
    .where(eq(whatsappMessageTemplates.templateType, templateType))
    .limit(1);
  return result[0];
}

export async function createWhatsappMessageTemplate(template: InsertWhatsappMessageTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(whatsappMessageTemplates).values(template).returning();
  return result[0];
}

export async function updateWhatsappMessageTemplate(id: number, template: Partial<InsertWhatsappMessageTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { ...template, updatedAt: new Date() };
  const result = await db
    .update(whatsappMessageTemplates)
    .set(updateData)
    .where(eq(whatsappMessageTemplates.id, id))
    .returning();
  return result[0];
}

export async function deleteWhatsappMessageTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(whatsappMessageTemplates).where(eq(whatsappMessageTemplates.id, id));
}

/**
 * HISTÓRICO DE NOTIFICAÇÕES WHATSAPP
 */
export async function createNotificationHistory(
  data: InsertWhatsappNotificationHistory
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create notification: database not available");
    return;
  }

  try {
    await db.insert(whatsappNotificationHistory).values(data);
  } catch (error) {
    console.error("[Database] Failed to create notification history:", error);
  }
}

export async function getNotificationHistory(limit: number = 100) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get notifications: database not available");
    return [];
  }

  try {
    return await db
      .select()
      .from(whatsappNotificationHistory)
      .orderBy(desc(whatsappNotificationHistory.sentAt))
      .limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get notification history:", error);
    return [];
  }
}

export async function getNotificationsByType(messageType: string, limit: number = 50) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get notifications: database not available");
    return [];
  }

  try {
    return await db
      .select()
      .from(whatsappNotificationHistory)
      .where(eq(whatsappNotificationHistory.messageType, messageType))
      .orderBy(desc(whatsappNotificationHistory.sentAt))
      .limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get notifications by type:", error);
    return [];
  }
}

export async function updateNotificationStatus(
  notificationId: number,
  status: string,
  errorMessage?: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update notification: database not available");
    return;
  }

  try {
    const updateData: any = { status };
    if (errorMessage) updateData.errorMessage = errorMessage;
    if (status === "delivered") updateData.deliveredAt = new Date();
    
    await db
      .update(whatsappNotificationHistory)
      .set(updateData)
      .where(eq(whatsappNotificationHistory.id, notificationId));
  } catch (error) {
    console.error("[Database] Failed to update notification status:", error);
  }
}


// ============================================
// CASH REGISTER (Abertura/Fechamento de Caixa)
// ============================================

export async function openCashRegister(data: {
  userId: number;
  cashAmount: string;
  cardAmount: string;
  pixAmount: string;
  creditAmount: string;
  fullContainersPhysical: number;
  emptyContainersPhysical: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(cashRegister).values({
    type: "opening",
    userId: data.userId,
    cashAmount: data.cashAmount,
    cardAmount: data.cardAmount,
    pixAmount: data.pixAmount,
    creditAmount: data.creditAmount,
    fullContainersPhysical: data.fullContainersPhysical,
    emptyContainersPhysical: data.emptyContainersPhysical,
    notes: data.notes,
    createdAt: new Date(),
  }).returning();

  return result;
}

export async function closeCashRegister(data: {
  userId: number;
  cashAmount: string;
  cardAmount: string;
  pixAmount: string;
  creditAmount: string;
  totalSales: string;
  fullContainersPhysical: number;
  emptyContainersPhysical: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(cashRegister).values({
    type: "closing",
    userId: data.userId,
    cashAmount: data.cashAmount,
    cardAmount: data.cardAmount,
    pixAmount: data.pixAmount,
    creditAmount: data.creditAmount,
    totalSales: data.totalSales,
    fullContainersPhysical: data.fullContainersPhysical,
    emptyContainersPhysical: data.emptyContainersPhysical,
    notes: data.notes,
    createdAt: new Date(),
  }).returning();

  return result;
}

export async function getTodayCashRegisterSessions() {
  const db = await getDb();
  if (!db) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await db
    .select()
    .from(cashRegister)
    .where(gte(cashRegister.createdAt, today))
    .orderBy(desc(cashRegister.createdAt));
}

export async function getLastCashRegisterSession() {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db
    .select()
    .from(cashRegister)
    .orderBy(desc(cashRegister.createdAt))
    .limit(1);

  return result || null;
}

export async function getCashRegisterHistory(limit: number = 30) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(cashRegister)
    .orderBy(desc(cashRegister.createdAt))
    .limit(limit);
}


// ============================================
// DASHBOARD STATS (Estatísticas do Dashboard)
// ============================================

export async function getTodaySalesCount() {
  const db = await getDb();
  if (!db) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(sales)
    .where(gte(sales.createdAt, today));

  return Number(result[0]?.count) || 0;
}

export async function getTodayRevenue() {
  const db = await getDb();
  if (!db) return "0";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)` })
    .from(sales)
    .where(gte(sales.createdAt, today));

  return result[0]?.total || "0";
}

export async function getPendingDeliveriesCount() {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(pendingSales)
    .where(eq(pendingSales.status, "pending"));

  return Number(result[0]?.count) || 0;
}

export async function getCustomersWithPendingContainers() {
  const db = await getDb();
  if (!db) return [];

  // Buscar vasilhames em posse de clientes
  const pendingContainers = await db
    .select({
      customerId: containers.customerId,
      productId: containers.productId,
      quantity: containers.quantity,
      updatedAt: containers.updatedAt,
    })
    .from(containers)
    .where(eq(containers.status, "customer_possession"));

  // Agrupar por cliente
  const customerMap = new Map<number, any>();

  for (const container of pendingContainers) {
    if (!container.customerId) continue;

    if (!customerMap.has(container.customerId)) {
      // Buscar dados do cliente
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, container.customerId))
        .limit(1);

      if (customer) {
        customerMap.set(container.customerId, {
          customer,
          containers: [],
          totalQuantity: 0,
        });
      }
    }

    const customerData = customerMap.get(container.customerId);
    if (customerData) {
      // Buscar nome do produto
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, container.productId))
        .limit(1);

      customerData.containers.push({
        productName: product?.name || "Produto desconhecido",
        quantity: container.quantity,
        updatedAt: container.updatedAt,
      });
      customerData.totalQuantity += container.quantity || 0;
    }
  }

  return Array.from(customerMap.values());
}


export async function getLowStockProducts() {
  const db = await getDb();
  if (!db) return [];

  // Buscar todos os produtos com estoque
  const allProducts = await db.select().from(products);
  const allInventory = await db.select().from(inventory);

  const lowStock = [];

  for (const product of allProducts) {
    const stock = allInventory.find((inv) => inv.productId === product.id);
    const stockQuantity = stock?.quantity || 0;
    const minStock = product.minStock || 5;

    if (stockQuantity < minStock) {
      lowStock.push({
        ...product,
        stockQuantity,
        minStock,
      });
    }
  }

  return lowStock;
}


// ============================================
// CATÁLOGO PÚBLICO (E-COMMERCE MVP)
// ============================================

export async function getPublicProducts() {
  const db = await getDb();
  if (!db) return [];

  // Retorna apenas produtos ativos com estoque > 0
  const result = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      salePrice: products.salePrice,
      isContainer: products.isContainer,
      stockQuantity: inventory.quantity,
    })
    .from(products)
    .leftJoin(inventory, eq(products.id, inventory.productId))
    .where(gt(inventory.quantity, 0));

  return result;
}

export async function createPublicOrder(data: {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: Array<{ productId: number; productName: string; quantity: number; unitPrice: string; subtotal: string }>;
  subtotal: string;
  discount: string;
  total: string;
  couponCode?: string;
  deliveryAddress: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Criar cliente público temporário (sem senha por enquanto - MVP)
  const [customer] = await db
    .insert(publicCustomers)
    .values({
      name: data.customerName,
      email: data.customerEmail || `${data.customerPhone}@temp.com`,
      phone: data.customerPhone,
      passwordHash: "temp", // MVP: sem autenticação
      address: data.deliveryAddress,
    })
    .onConflictDoUpdate({
      target: publicCustomers.email,
      set: {
        name: data.customerName,
        phone: data.customerPhone,
        address: data.deliveryAddress,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Criar pedido
  const [order] = await db
    .insert(publicOrders)
    .values({
      publicCustomerId: customer.id,
      items: data.items,
      subtotal: data.subtotal,
      discount: data.discount,
      total: data.total,
      couponCode: data.couponCode,
      status: "pending",
      deliveryAddress: data.deliveryAddress,
      notes: data.notes,
    })
    .returning();

  return order;
}

export async function getPublicOrders() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: publicOrders.id,
      customer: {
        name: publicCustomers.name,
        phone: publicCustomers.phone,
        email: publicCustomers.email,
      },
      items: publicOrders.items,
      subtotal: publicOrders.subtotal,
      discount: publicOrders.discount,
      total: publicOrders.total,
      couponCode: publicOrders.couponCode,
      status: publicOrders.status,
      deliveryAddress: publicOrders.deliveryAddress,
      notes: publicOrders.notes,
      createdAt: publicOrders.createdAt,
    })
    .from(publicOrders)
    .leftJoin(publicCustomers, eq(publicOrders.publicCustomerId, publicCustomers.id))
    .orderBy(desc(publicOrders.createdAt));

  return result;
}

export async function validateCoupon(code: string, purchaseAmount: number) {
  const db = await getDb();
  if (!db) return null;

  const [coupon] = await db
    .select()
    .from(coupons)
    .where(and(
      eq(coupons.code, code),
      eq(coupons.isActive, true),
      lte(coupons.validFrom, new Date()),
      gte(coupons.validUntil, new Date())
    ));

  if (!coupon) return null;

  // Verificar valor mínimo de compra
  if (parseFloat(coupon.minPurchaseAmount || "0") > purchaseAmount) {
    return { error: `Valor mínimo de compra: R$ ${coupon.minPurchaseAmount}` };
  }

  // Verificar limite de usos
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return { error: "Cupom esgotado" };
  }

  return coupon;
}

export async function applyCoupon(code: string) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(coupons)
    .set({
      usedCount: sql`${coupons.usedCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(coupons.code, code));
}

export async function createCoupon(data: {
  code: string;
  discountType: "percentage" | "fixed_amount";
  discountValue: string;
  minPurchaseAmount?: string;
  maxUses?: number;
  validFrom: Date;
  validUntil: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const [coupon] = await db
    .insert(coupons)
    .values({
      code: data.code.toUpperCase(),
      discountType: data.discountType,
      discountValue: data.discountValue,
      minPurchaseAmount: data.minPurchaseAmount || "0",
      maxUses: data.maxUses,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      isActive: true,
    })
    .returning();

  return coupon;
}

export async function getCoupons() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function updateCouponStatus(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(coupons)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(coupons.id, id));
}


// ============================================
// Catalog Settings Helpers
// ============================================

export async function getCatalogSettings() {
  const db = await getDb();
  if (!db) return null;

  const settings = await db.select().from(catalogSettings).limit(1);
  return settings[0] || null;
}

export async function updateCatalogSettings(data: {
  whatsappNumber?: string;
  defaultMessage?: string;
  cloudflareApiToken?: string;
  cloudflareZoneId?: string;
  customDomain?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const existing = await getCatalogSettings();
  
  if (existing) {
    const [updated] = await db
      .update(catalogSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(catalogSettings.id, existing.id))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(catalogSettings)
      .values({
        whatsappNumber: data.whatsappNumber || "5511999999999",
        defaultMessage: data.defaultMessage,
        cloudflareApiToken: data.cloudflareApiToken,
        cloudflareZoneId: data.cloudflareZoneId,
        customDomain: data.customDomain,
      })
      .returning();
    return created;
  }
}

export async function updatePublicOrderStatus(orderId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const [updated] = await db
    .update(publicOrders)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(publicOrders.id, orderId))
    .returning();
  return updated;
}


/**
 * ============================================
 * ENTREGADORES (DELIVERERS)
 * ============================================
 */

export async function createDeliverer(data: { name: string; phone: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const [deliverer] = await db.insert(deliverers).values(data).returning();
  return deliverer;
}

export async function getDeliverers() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  return await db.select().from(deliverers).orderBy(deliverers.name);
}

export async function getActiveDeliverers() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  return await db.select().from(deliverers).where(eq(deliverers.isActive, true)).orderBy(deliverers.name);
}

export async function getDelivererById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const [deliverer] = await db.select().from(deliverers).where(eq(deliverers.id, id));
  return deliverer;
}

export async function updateDeliverer(id: number, data: { name?: string; phone?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const [deliverer] = await db
    .update(deliverers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(deliverers.id, id))
    .returning();
  return deliverer;
}

export async function deleteDeliverer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  await db.delete(deliverers).where(eq(deliverers.id, id));
}

export async function toggleDelivererStatus(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const deliverer = await getDelivererById(id);
  if (!deliverer) throw new Error("Entregador não encontrado");
  
  const [updated] = await db
    .update(deliverers)
    .set({ isActive: !deliverer.isActive, updatedAt: new Date() })
    .where(eq(deliverers.id, id))
    .returning();
  return updated;
}

/**
 * ============================================
 * PEDIDOS COM ENTREGAS
 * ============================================
 */

export async function getPendingDeliveryOrders() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  // Buscar pedidos de vendas (PDV) pendentes de entrega
  const salesOrders = await db
    .select({
      id: sales.id,
      type: sql<string>`'sale'`,
      customerId: sales.customerId,
      customerName: customers.name,
      customerPhone: customers.phone,
      totalAmount: sales.totalAmount,
      salesChannel: sales.salesChannel,
      deliveryStatus: sales.deliveryStatus,
      delivererId: sales.delivererId,
      deliveryAddress: sales.deliveryAddress,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(
      and(
        sql`${sales.salesChannel} != 'portaria'`, // Excluir Portaria
        sql`${sales.deliveryStatus} != 'delivered'` // Excluir já entregues
      )
    )
    .orderBy(sales.createdAt);

  // Buscar pedidos do catálogo público pendentes de entrega
  const publicOrdersList = await db
    .select({
      id: publicOrders.id,
      type: sql<string>`'public_order'`,
      customerId: publicOrders.publicCustomerId,
      customerName: publicCustomers.name,
      customerPhone: publicCustomers.phone,
      totalAmount: publicOrders.total,
      salesChannel: sql<string>`'catalogo'`,
      deliveryStatus: publicOrders.status,
      delivererId: publicOrders.delivererId,
      deliveryAddress: publicOrders.deliveryAddress,
      createdAt: publicOrders.createdAt,
    })
    .from(publicOrders)
    .leftJoin(publicCustomers, eq(publicOrders.publicCustomerId, publicCustomers.id))
    .where(sql`${publicOrders.status} != 'delivered'`)
    .orderBy(publicOrders.createdAt);

  return [...salesOrders, ...publicOrdersList].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function assignDelivererToOrder(orderId: number, orderType: 'sale' | 'public_order', delivererId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  if (orderType === 'sale') {
    const [updated] = await db
      .update(sales)
      .set({ delivererId, updatedAt: new Date() })
      .where(eq(sales.id, orderId))
      .returning();
    return updated;
  } else {
    const [updated] = await db
      .update(publicOrders)
      .set({ delivererId, updatedAt: new Date() })
      .where(eq(publicOrders.id, orderId))
      .returning();
    return updated;
  }
}

export async function updateOrderDeliveryStatus(orderId: number, orderType: 'sale' | 'public_order', status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  if (orderType === 'sale') {
    const [updated] = await db
      .update(sales)
      .set({ deliveryStatus: status as any, updatedAt: new Date() })
      .where(eq(sales.id, orderId))
      .returning();
    return updated;
  } else {
    const [updated] = await db
      .update(publicOrders)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(publicOrders.id, orderId))
      .returning();
    return updated;
  }
}
