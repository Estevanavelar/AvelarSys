ALTER TABLE "orders" ADD COLUMN "warranty_term_ids" jsonb;
--> statement-breakpoint
CREATE TABLE "warranty_terms" (
	"id" varchar(10) PRIMARY KEY NOT NULL,
	"account_id" varchar(14) NOT NULL,
	"owner_cpf" varchar(11) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "warranty_terms" ADD CONSTRAINT "warranty_terms_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
