import { boolean, decimal, integer, json, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums para Catálogo Público
const discountTypeEnum = pgEnum("discount_type", ["percentage", "fixed_amount"]);
const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "in_delivery", "delivered", "cancelled"]);

// Enum para Status de Entrega
export const deliveryStatusEnum = pgEnum("delivery_status", ["pending", "in_transit", "delivered"]);

/**
 * Core user table backing auth flow.
 * Extended for role-based access control in NaldoGás.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: pgEnum("role", ["admin", "vendor", "deliverer", "user"])("role").notNull().default("user"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Produtos: GLP 13Kg, Água 20L, acessórios, etc.
 */
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 100 }).unique(),
  salePrice: decimal("salePrice", { precision: 10, scale: 2 }).notNull(), // Deprecated: use priceCash or priceCard
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }).notNull(),
  priceCash: decimal("priceCash", { precision: 10, scale: 2 }), // Preço para PIX/Dinheiro (à vista)
  priceCard: decimal("priceCard", { precision: 10, scale: 2 }), // Preço para Cartão Crédito/Débito
  minStock: integer("minStock").default(5),
  isContainer: boolean("isContainer").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Estoque de produtos
 */
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull().references(() => products.id),
  quantity: integer("quantity").default(0),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

/**
 * Clientes: nome, telefone, endereço, etc.
 */
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  cpf: varchar("cpf", { length: 14 }).unique(),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * Vasilhames: controle de cheios, vazios e em posse de clientes
 */
export const containers = pgTable("containers", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull().references(() => products.id),
  status: pgEnum("container_status", ["full", "empty", "customer_possession"])("status").notNull().default("full"),
  customerId: integer("customerId").references(() => customers.id),
  quantity: integer("quantity").default(0),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Container = typeof containers.$inferSelect;
export type InsertContainer = typeof containers.$inferInsert;

/**
 * Vendas: registro de transações
 */
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId").references(() => customers.id),
  vendorId: integer("vendorId").notNull().references(() => users.id),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  paymentMethod: pgEnum("payment_method", ["cash", "credit_card", "debit_card", "pix", "credit"])("paymentMethod").notNull(),
  salesChannel: pgEnum("sales_channel", ["portaria", "telegas", "whatsapp"])("salesChannel").notNull().default("portaria"),
  status: pgEnum("sale_status", ["completed", "pending", "cancelled"])("status").notNull().default("completed"),
  containerExchanged: boolean("containerExchanged").default(true), // Cliente trocou vasilhame?
  containerOwed: integer("containerOwed").default(0), // Quantidade de vasilhames que o cliente ficou devendo
  delivererId: integer("delivererId").references(() => deliverers.id), // Entregador responsável
  deliveryStatus: deliveryStatusEnum("deliveryStatus").default("pending"), // Status de entrega
  deliveryAddress: json("deliveryAddress").$type<{
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  }>(), // Endereço de entrega (obrigatório para TeleGás/WhatsApp)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

/**
 * Itens de venda
 */
export const saleItems = pgTable("saleItems", {
  id: serial("id").primaryKey(),
  saleId: integer("saleId").notNull().references(() => sales.id),
  productId: integer("productId").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
});

export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = typeof saleItems.$inferInsert;

/**
 * Contas a Receber: Fiados
 */
export const receivables = pgTable("receivables", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId").notNull().references(() => customers.id),
  saleId: integer("saleId").notNull().references(() => sales.id),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paidAmount", { precision: 10, scale: 2 }).default("0"),
  status: pgEnum("receivable_status", ["pending", "partial", "paid", "overdue"])("status").notNull().default("pending"),
  dueDate: timestamp("dueDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Receivable = typeof receivables.$inferSelect;
export type InsertReceivable = typeof receivables.$inferInsert;

/**
 * Contas a Pagar: Despesas
 */
export const payables = pgTable("payables", {
  id: serial("id").primaryKey(),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }),
  dueDate: timestamp("dueDate").notNull(),
  paidDate: timestamp("paidDate"),
  status: pgEnum("payable_status", ["pending", "paid"])("status").notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Payable = typeof payables.$inferSelect;
export type InsertPayable = typeof payables.$inferInsert;

/**
 * Vendas Pendentes: Pedidos aguardando entrega
 */
export const pendingSales = pgTable("pendingSales", {
  id: serial("id").primaryKey(),
  saleId: integer("saleId").notNull().references(() => sales.id),
  customerId: integer("customerId").notNull().references(() => customers.id),
  delivererId: integer("delivererId").references(() => users.id),
  status: pgEnum("pending_sale_status", ["pending", "in_transit", "delivered", "cancelled"])("status").notNull().default("pending"),
  deliveryAddress: text("deliveryAddress"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PendingSale = typeof pendingSales.$inferSelect;
export type InsertPendingSale = typeof pendingSales.$inferInsert;

// Tabela de histórico de notificações WhatsApp
export const whatsappNotificationHistory = pgTable("whatsappNotificationHistory", {
  id: serial("id").primaryKey(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  message: text("message").notNull(),
  messageType: varchar("messageType", { length: 50 }).notNull(), // sale, delivery, reminder, stock
  status: varchar("status", { length: 20 }).default("sent").notNull(), // sent, failed, pending
  relatedSaleId: integer("relatedSaleId"),
  relatedDeliveryId: integer("relatedDeliveryId"),
  relatedReceivableId: integer("relatedReceivableId"),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  deliveredAt: timestamp("deliveredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WhatsappNotificationHistory = typeof whatsappNotificationHistory.$inferSelect;
export type InsertWhatsappNotificationHistory = typeof whatsappNotificationHistory.$inferInsert;

/**
 * Configuração de WhatsApp para notificações
 */
export const whatsappConfig = pgTable("whatsappConfig", {
  id: serial("id").primaryKey(),
  businessPhoneNumber: varchar("businessPhoneNumber", { length: 20 }).notNull(),
  notificationPhoneNumber: varchar("notificationPhoneNumber", { length: 20 }).notNull(),
  isEnabled: boolean("isEnabled").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WhatsappConfig = typeof whatsappConfig.$inferSelect;
export type InsertWhatsappConfig = typeof whatsappConfig.$inferInsert;

/**
 * Templates de mensagens WhatsApp
 */
export const whatsappMessageTemplates = pgTable("whatsappMessageTemplates", {
  id: serial("id").primaryKey(),
  templateType: varchar("templateType", { length: 50 }).notNull(), // 'sale', 'pending_delivery', 'payment_reminder', 'low_stock'
  title: varchar("title", { length: 100 }).notNull(),
  messageContent: text("messageContent").notNull(),
  variables: text("variables"), // JSON com variáveis disponíveis (ex: {{clientName}}, {{totalAmount}}, {{productList}})
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WhatsappMessageTemplate = typeof whatsappMessageTemplates.$inferSelect;
export type InsertWhatsappMessageTemplate = typeof whatsappMessageTemplates.$inferInsert;

/**
 * Abertura e Fechamento de Caixa
 */
export const cashRegister = pgTable("cashRegister", {
  id: serial("id").primaryKey(),
  type: pgEnum("cash_register_type", ["opening", "closing"])("type").notNull(),
  userId: integer("userId").notNull().references(() => users.id),
  
  // Valores financeiros
  cashAmount: decimal("cashAmount", { precision: 10, scale: 2 }).default("0"),
  cardAmount: decimal("cardAmount", { precision: 10, scale: 2 }).default("0"),
  pixAmount: decimal("pixAmount", { precision: 10, scale: 2 }).default("0"),
  creditAmount: decimal("creditAmount", { precision: 10, scale: 2 }).default("0"),
  totalSales: decimal("totalSales", { precision: 10, scale: 2 }).default("0"),
  
  // Contagem de vasilhames (físico)
  fullContainersPhysical: integer("fullContainersPhysical").default(0),
  emptyContainersPhysical: integer("emptyContainersPhysical").default(0),
  
  // Contagem de vasilhames (virtual/sistema)
  fullContainersVirtual: integer("fullContainersVirtual").default(0),
  emptyContainersVirtual: integer("emptyContainersVirtual").default(0),
  
  // Diferenças (físico - virtual)
  fullContainersDifference: integer("fullContainersDifference").default(0),
  emptyContainersDifference: integer("emptyContainersDifference").default(0),
  
  // Observações e ajustes
  notes: text("notes"),
  adjustmentReason: text("adjustmentReason"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CashRegister = typeof cashRegister.$inferSelect;
export type InsertCashRegister = typeof cashRegister.$inferInsert;

/**
 * Relações entre tabelas
 */
export const usersRelations = relations(users, ({ many }) => ({
  sales: many(sales),
  pendingSales: many(pendingSales),
}));

export const productsRelations = relations(products, ({ many }) => ({
  inventory: many(inventory),
  containers: many(containers),
  saleItems: many(saleItems),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
  receivables: many(receivables),
  containers: many(containers),
  pendingSales: many(pendingSales),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, { fields: [sales.customerId], references: [customers.id] }),
  vendor: one(users, { fields: [sales.vendorId], references: [users.id] }),
  items: many(saleItems),
  receivable: one(receivables),
  pendingSale: one(pendingSales),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, { fields: [saleItems.productId], references: [products.id] }),
}));

export const receivablesRelations = relations(receivables, ({ one }) => ({
  customer: one(customers, { fields: [receivables.customerId], references: [customers.id] }),
  sale: one(sales, { fields: [receivables.saleId], references: [sales.id] }),
}));

export const pendingSalesRelations = relations(pendingSales, ({ one }) => ({
  sale: one(sales, { fields: [pendingSales.saleId], references: [sales.id] }),
  customer: one(customers, { fields: [pendingSales.customerId], references: [customers.id] }),
  deliverer: one(users, { fields: [pendingSales.delivererId], references: [users.id] }),
}));


// ============================================
// CATÁLOGO PÚBLICO (E-COMMERCE)
// ============================================

/**
 * Cupons de Desconto
 */
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  discountType: discountTypeEnum("discount_type").notNull(), // 'percentage' | 'fixed_amount'
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minPurchaseAmount: decimal("min_purchase_amount", { precision: 10, scale: 2 }).default("0"),
  maxUses: integer("max_uses"), // null = ilimitado
  usedCount: integer("used_count").default(0).notNull(),
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

/**
 * Clientes do Catálogo Público
 */
export const publicCustomers = pgTable("public_customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  cpf: varchar("cpf", { length: 14 }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  address: json("address").$type<{
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PublicCustomer = typeof publicCustomers.$inferSelect;
export type InsertPublicCustomer = typeof publicCustomers.$inferInsert;

/**
 * Pedidos do Catálogo Público
 */
export const publicOrders = pgTable("public_orders", {
  id: serial("id").primaryKey(),
  publicCustomerId: integer("public_customer_id").references(() => publicCustomers.id).notNull(),
  items: json("items").$type<Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
  }>>().notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  couponCode: varchar("coupon_code", { length: 50 }),
  status: orderStatusEnum("status").default("pending").notNull(),
  deliveryAddress: json("delivery_address").$type<{
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  }>().notNull(),
  notes: text("notes"),
  delivererId: integer("deliverer_id").references(() => deliverers.id), // Entregador responsável
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PublicOrder = typeof publicOrders.$inferSelect;
export type InsertPublicOrder = typeof publicOrders.$inferInsert;

/**
 * Relações do Catálogo Público
 */
export const publicCustomersRelations = relations(publicCustomers, ({ many }) => ({
  orders: many(publicOrders),
}));

export const publicOrdersRelations = relations(publicOrders, ({ one }) => ({
  customer: one(publicCustomers, { fields: [publicOrders.publicCustomerId], references: [publicCustomers.id] }),
}));


/**
 * Configurações do Catálogo Público
 */
export const catalogSettings = pgTable("catalog_settings", {
  id: serial("id").primaryKey(),
  whatsappNumber: varchar("whatsapp_number", { length: 20 }).notNull(),
  defaultMessage: text("default_message"),
  cloudflareApiToken: varchar("cloudflare_api_token", { length: 255 }),
  cloudflareZoneId: varchar("cloudflare_zone_id", { length: 255 }),
  customDomain: varchar("custom_domain", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CatalogSettings = typeof catalogSettings.$inferSelect;
export type InsertCatalogSettings = typeof catalogSettings.$inferInsert;


/**
 * Entregadores
 */
export const deliverers = pgTable("deliverers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Deliverer = typeof deliverers.$inferSelect;
export type InsertDeliverer = typeof deliverers.$inferInsert;
