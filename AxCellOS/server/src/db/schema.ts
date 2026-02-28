import { pgTable, varchar, text, timestamp, jsonb, decimal, boolean, integer, uuid } from "drizzle-orm/pg-core";

// =================================
// BASE HELPERS
// =================================

// Base timestamps
const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
};

// =================================
// USERS (STORE/ACCOUNT DATA FROM AVADMIN)
// =================================
// Esta tabela armazena os dados da EMPRESA/LOJA
// Preenchida uma vez no primeiro acesso, puxando de accounts do AvAdmin

export const users = pgTable("users", {
  // Identidade (de accounts.id)
  id: varchar("id", { length: 14 }).primaryKey(),  // CPF ou CNPJ
  documentType: varchar("document_type", { length: 4 }),  // cpf ou cnpj
  document: varchar("document", { length: 14 }),  // Documento sem formatação

  // Informações da Empresa
  businessName: varchar("business_name", { length: 255 }),
  companyName: varchar("company_name", { length: 255 }),  // Alias

  // Multi-Tenancy
  ownerCpf: varchar("owner_cpf", { length: 11 }).notNull(),
  isIndividual: boolean("is_individual"),

  // Contato
  whatsapp: varchar("whatsapp", { length: 15 }),

  // Endereço da empresa
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zip_code", { length: 8 }),

  // Status
  status: varchar("status", { length: 50 }).default("active"),
  enabledModules: jsonb("enabled_modules"),

  // Historico
  previousDocument: varchar("previous_document", { length: 14 }),
  planId: uuid("plan_id"),

  // Controle
  clientType: varchar("client_type", { length: 50 }),
  settings: jsonb("settings"),
  isActive: boolean("is_active").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at"), // Última sincronização com AvAdmin
  ...timestamps,
});

// =================================
// CUSTOMERS (REFERENCE TO AVADMIN USERS)
// =================================
// Esta tabela contém apenas IDs que referenciam users do AvAdmin
// Os clientes finais (client_type="cliente") do AvAdmin

export const customers = pgTable("customers", {
  // ID = CPF do cliente final (vem de users.id do AvAdmin)
  id: varchar("id", { length: 11 }).primaryKey(), // CPF - 11 digits
  
  // Multi-tenancy: qual empresa este cliente pertence
  accountId: varchar("account_id", { length: 14 }).notNull().references(() => users.id),
  
  // Cache de dados básicos do AvAdmin (para performance/offline)
  // Estes dados são sincronizados do AvAdmin, não editados localmente
  name: varchar("name", { length: 255 }), // Cache do full_name
  whatsapp: varchar("whatsapp", { length: 15 }), // Cache do whatsapp
  
  // Dados locais específicos do AxCellOS
  notes: text("notes"), // Observações do lojista sobre o cliente
  
  // Controle
  isActive: boolean("is_active").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at"), // Última sincronização com AvAdmin
  ...timestamps,
});

// =================================
// DEVICES
// =================================

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: varchar("account_id", { length: 14 }).notNull().references(() => users.id),
  ownerCpf: varchar("owner_cpf", { length: 11 }).notNull(), // Multi-tenancy
  
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // android, ios, web
  deviceId: varchar("device_id", { length: 255 }).notNull(),
  pushToken: text("push_token"),
  isActive: boolean("is_active").notNull().default(true),
  lastActiveAt: timestamp("last_active_at"),
  
  // Quem registrou o device (CPF do operador - referência ao AvAdmin)
  operatorCpf: varchar("operator_cpf", { length: 11 }),
  ...timestamps,
});

// =================================
// CUSTOMER DEVICES (APARELHOS POR CLIENTE)
// =================================
// Catálogo de aparelhos vinculados ao cliente final (CPF) por conta

export const customerDevices = pgTable("customer_devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: varchar("account_id", { length: 14 }).notNull().references(() => users.id),
  ownerCpf: varchar("owner_cpf", { length: 11 }).notNull(), // Multi-tenancy
  customerId: varchar("customer_id", { length: 11 }).notNull().references(() => customers.id),

  brand: varchar("brand", { length: 100 }).notNull(),
  model: varchar("model", { length: 150 }).notNull(),
  deviceLabel: varchar("device_label", { length: 300 }).notNull(), // "APPLE IPHONE 14 PRO MAX"

  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

// =================================
// PRODUCTS
// =================================

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: varchar("account_id", { length: 14 }).notNull().references(() => users.id),
  ownerCpf: varchar("owner_cpf", { length: 11 }).notNull(), // Multi-tenancy
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 100 }),
  barcode: varchar("barcode", { length: 100 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  category: varchar("category", { length: 100 }),
  unit: varchar("unit", { length: 20 }).default("unidade"),
  stock: integer("stock").notNull().default(0),
  minStock: integer("min_stock").default(0),
  maxStock: integer("max_stock"),
  isActive: boolean("is_active").notNull().default(true),
  imageUrl: text("image_url"),
  metadata: jsonb("metadata"),
  ...timestamps,
});

// =================================
// ORDERS (ORDENS DE SERVIÇO)
// =================================

export const orders = pgTable("orders", {
  /** ID da ordem = número da OS (formato yymmddhhmm). Único identificador; order_number é espelho do id. */
  id: varchar("id", { length: 50 }).primaryKey(),
  accountId: varchar("account_id", { length: 14 }).notNull().references(() => users.id),
  ownerCpf: varchar("owner_cpf", { length: 11 }).notNull(), // Multi-tenancy

  /** Número da OS; sempre igual a id. */
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  
  // Cliente: referência ao customers (que referencia users do AvAdmin)
  customerId: varchar("customer_id", { length: 11 }).references(() => customers.id),
  
  // Operador que criou a ordem (CPF - referência ao AvAdmin)
  operatorCpf: varchar("operator_cpf", { length: 11 }).notNull(),
  
  // Status da ordem
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  // draft, pending, confirmed, in_progress, ready, delivered, cancelled
  
  // Valores
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0.00"),
  
  // Detalhes
  notes: text("notes"),
  deliveryAddress: jsonb("delivery_address"),
  
  // Pagamento
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentStatus: varchar("payment_status", { length: 50 }).default("pending"),
  
  // Agendamento e entrega
  scheduledFor: timestamp("scheduled_for"),
  deliveredAt: timestamp("delivered_at"),

  // Garantia (ordens de serviço)
  warrantyUntil: timestamp("warranty_until"),
  warrantyTermIds: jsonb("warranty_term_ids"),

  // Senha do aparelho (PIN/pattern para desbloquear o celular)
  devicePassword: varchar("device_password", { length: 50 }),
  ...timestamps,
});

// =================================
// ORDER ITEMS
// =================================

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: varchar("order_id", { length: 50 }).references(() => orders.id).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  
  quantity: decimal("quantity", { precision: 10, scale: 4 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0.00"),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  ...timestamps,
});

// =================================
// SALES (VENDAS DO PDV)
// =================================

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: varchar("account_id", { length: 14 }).notNull().references(() => users.id),
  ownerCpf: varchar("owner_cpf", { length: 11 }).notNull(), // Multi-tenancy
  
  // Referência opcional à ordem (se veio de uma OS)
  orderId: varchar("order_id", { length: 50 }).references(() => orders.id),
  
  // Cliente: referência ao customers
  customerId: varchar("customer_id", { length: 11 }).references(() => customers.id),
  
  // Operador que fez a venda (CPF - referência ao AvAdmin)
  operatorCpf: varchar("operator_cpf", { length: 11 }).notNull(),
  
  // Valores
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0.00"),
  
  // Pagamento
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentStatus: varchar("payment_status", { length: 50 }).default("paid"),
  installments: integer("installments").default(1),
  feeAmount: decimal("fee_amount", { precision: 10, scale: 2 }).default("0.00"),
  feePercent: decimal("fee_percent", { precision: 5, scale: 2 }).default("0.00"),
  netValue: decimal("net_value", { precision: 10, scale: 2 }),
  
  items: jsonb("items"),
  notes: text("notes"),
  ...timestamps,
});

// =================================
// SALE ITEMS
// =================================

export const saleItems = pgTable("sale_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id").references(() => sales.id).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  
  quantity: decimal("quantity", { precision: 10, scale: 4 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0.00"),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  ...timestamps,
});

// =================================
// SETTINGS
// =================================

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: varchar("account_id", { length: 14 }).notNull().references(() => users.id),
  
  key: varchar("key", { length: 255 }).notNull(),
  value: jsonb("value"),
  category: varchar("category", { length: 100 }),
  isPublic: boolean("is_public").notNull().default(false),
  ...timestamps,
});

// =================================
// WARRANTY TERMS
// =================================

export const warrantyTerms = pgTable("warranty_terms", {
  id: varchar("id", { length: 10 }).primaryKey(), // 10 letras maiúsculas
  accountId: varchar("account_id", { length: 14 }).notNull(), // ID da conta (sem FK: token pode vir antes do sync em users)
  ownerCpf: varchar("owner_cpf", { length: 11 }).notNull(), // Multi-tenancy
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(), // texto longo (sem limite prático no PostgreSQL)
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

// =================================
// REPORTS DATA
// =================================

export const reportData = pgTable("report_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: varchar("account_id", { length: 14 }).notNull().references(() => users.id),
  
  type: varchar("type", { length: 50 }).notNull(),
  date: timestamp("date").notNull(),
  data: jsonb("data").notNull(),
  
  // Quem gerou o relatório (CPF - referência ao AvAdmin)
  generatedByCpf: varchar("generated_by_cpf", { length: 11 }),
  ...timestamps,
});

// =================================
// TYPE EXPORTS
// =================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;

export type CustomerDevice = typeof customerDevices.$inferSelect;
export type NewCustomerDevice = typeof customerDevices.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;

export type SaleItem = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export type WarrantyTerm = typeof warrantyTerms.$inferSelect;
export type NewWarrantyTerm = typeof warrantyTerms.$inferInsert;

export type Report = typeof reportData.$inferSelect;
export type NewReport = typeof reportData.$inferInsert;
