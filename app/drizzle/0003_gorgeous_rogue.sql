CREATE TYPE "public"."asset_status" AS ENUM('active', 'inactive', 'maintenance', 'retired', 'lost_stolen');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('hardware', 'software', 'network', 'mobile', 'peripherals', 'server', 'other');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "asset_type" NOT NULL,
	"status" "asset_status" DEFAULT 'active' NOT NULL,
	"serial_number" varchar(255),
	"model" varchar(255),
	"manufacturer" varchar(255),
	"location" varchar(255),
	"assigned_to" varchar(255),
	"purchase_date" timestamp,
	"warranty_expiry" timestamp,
	"purchase_price" numeric(10, 2),
	"notes" text,
	"last_maintenance_date" timestamp,
	"next_maintenance_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;