CREATE TABLE "cashRegister" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "cash_register_type" NOT NULL,
	"userId" integer NOT NULL,
	"cashAmount" numeric(10, 2) DEFAULT '0',
	"cardAmount" numeric(10, 2) DEFAULT '0',
	"pixAmount" numeric(10, 2) DEFAULT '0',
	"creditAmount" numeric(10, 2) DEFAULT '0',
	"totalSales" numeric(10, 2) DEFAULT '0',
	"fullContainersPhysical" integer DEFAULT 0,
	"emptyContainersPhysical" integer DEFAULT 0,
	"fullContainersVirtual" integer DEFAULT 0,
	"emptyContainersVirtual" integer DEFAULT 0,
	"fullContainersDifference" integer DEFAULT 0,
	"emptyContainersDifference" integer DEFAULT 0,
	"notes" text,
	"adjustmentReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "containers" (
	"id" serial PRIMARY KEY NOT NULL,
	"productId" integer NOT NULL,
	"status" "container_status" DEFAULT 'full' NOT NULL,
	"customerId" integer,
	"quantity" integer DEFAULT 0,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"discount_type" "discount_type" NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"min_purchase_amount" numeric(10, 2) DEFAULT '0',
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"valid_from" timestamp NOT NULL,
	"valid_until" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"cpf" varchar(14),
	"email" varchar(320),
	"address" text,
	"city" varchar(100),
	"state" varchar(2),
	"zipCode" varchar(10),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"productId" integer NOT NULL,
	"quantity" integer DEFAULT 0,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payables" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" varchar(255) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"category" varchar(100),
	"dueDate" timestamp NOT NULL,
	"paidDate" timestamp,
	"status" "payable_status" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pendingSales" (
	"id" serial PRIMARY KEY NOT NULL,
	"saleId" integer NOT NULL,
	"customerId" integer NOT NULL,
	"delivererId" integer,
	"status" "pending_sale_status" DEFAULT 'pending' NOT NULL,
	"deliveryAddress" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"sku" varchar(100),
	"salePrice" numeric(10, 2) NOT NULL,
	"costPrice" numeric(10, 2) NOT NULL,
	"minStock" integer DEFAULT 5,
	"isContainer" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "public_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"cpf" varchar(14),
	"password_hash" varchar(255) NOT NULL,
	"address" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "public_customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "public_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_customer_id" integer NOT NULL,
	"items" json NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"discount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"coupon_code" varchar(50),
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"delivery_address" json NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receivables" (
	"id" serial PRIMARY KEY NOT NULL,
	"customerId" integer NOT NULL,
	"saleId" integer NOT NULL,
	"totalAmount" numeric(10, 2) NOT NULL,
	"paidAmount" numeric(10, 2) DEFAULT '0',
	"status" "receivable_status" DEFAULT 'pending' NOT NULL,
	"dueDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saleItems" (
	"id" serial PRIMARY KEY NOT NULL,
	"saleId" integer NOT NULL,
	"productId" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(10, 2) NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"customerId" integer,
	"vendorId" integer NOT NULL,
	"totalAmount" numeric(10, 2) NOT NULL,
	"discount" numeric(10, 2) DEFAULT '0',
	"paymentMethod" "payment_method" NOT NULL,
	"salesChannel" "sales_channel" DEFAULT 'portaria' NOT NULL,
	"status" "sale_status" DEFAULT 'completed' NOT NULL,
	"containerExchanged" boolean DEFAULT true,
	"containerOwed" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "whatsappConfig" (
	"id" serial PRIMARY KEY NOT NULL,
	"businessPhoneNumber" varchar(20) NOT NULL,
	"notificationPhoneNumber" varchar(20) NOT NULL,
	"isEnabled" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsappMessageTemplates" (
	"id" serial PRIMARY KEY NOT NULL,
	"templateType" varchar(50) NOT NULL,
	"title" varchar(100) NOT NULL,
	"messageContent" text NOT NULL,
	"variables" text,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsappNotificationHistory" (
	"id" serial PRIMARY KEY NOT NULL,
	"phoneNumber" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"messageType" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'sent' NOT NULL,
	"relatedSaleId" integer,
	"relatedDeliveryId" integer,
	"relatedReceivableId" integer,
	"errorMessage" text,
	"sentAt" timestamp DEFAULT now() NOT NULL,
	"deliveredAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cashRegister" ADD CONSTRAINT "cashRegister_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "containers" ADD CONSTRAINT "containers_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "containers" ADD CONSTRAINT "containers_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pendingSales" ADD CONSTRAINT "pendingSales_saleId_sales_id_fk" FOREIGN KEY ("saleId") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pendingSales" ADD CONSTRAINT "pendingSales_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pendingSales" ADD CONSTRAINT "pendingSales_delivererId_users_id_fk" FOREIGN KEY ("delivererId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_orders" ADD CONSTRAINT "public_orders_public_customer_id_public_customers_id_fk" FOREIGN KEY ("public_customer_id") REFERENCES "public"."public_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_saleId_sales_id_fk" FOREIGN KEY ("saleId") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saleItems" ADD CONSTRAINT "saleItems_saleId_sales_id_fk" FOREIGN KEY ("saleId") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saleItems" ADD CONSTRAINT "saleItems_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_vendorId_users_id_fk" FOREIGN KEY ("vendorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;