CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'in_transit', 'delivered');--> statement-breakpoint
CREATE TABLE "deliverers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public_orders" ADD COLUMN "deliverer_id" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "delivererId" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "deliveryStatus" "delivery_status" DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "deliveryAddress" json;--> statement-breakpoint
ALTER TABLE "public_orders" ADD CONSTRAINT "public_orders_deliverer_id_deliverers_id_fk" FOREIGN KEY ("deliverer_id") REFERENCES "public"."deliverers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_delivererId_deliverers_id_fk" FOREIGN KEY ("delivererId") REFERENCES "public"."deliverers"("id") ON DELETE no action ON UPDATE no action;