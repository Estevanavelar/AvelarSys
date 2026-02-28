CREATE TABLE "catalog_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"whatsapp_number" varchar(20) NOT NULL,
	"default_message" text,
	"cloudflare_api_token" varchar(255),
	"cloudflare_zone_id" varchar(255),
	"custom_domain" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
