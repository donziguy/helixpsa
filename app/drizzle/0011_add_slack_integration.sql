-- Update notification_channel enum to include slack
DO $$ BEGIN
 ALTER TYPE "public"."notification_channel" ADD VALUE 'slack';
EXCEPTION
 WHEN others THEN null;
END $$;

-- Create slack_integrations table
CREATE TABLE IF NOT EXISTS "slack_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"team_id" varchar(255) NOT NULL,
	"team_name" varchar(255) NOT NULL,
	"bot_user_id" varchar(255) NOT NULL,
	"bot_access_token" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create slack_notifications table
CREATE TABLE IF NOT EXISTS "slack_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"slack_channel_id" varchar(255) NOT NULL,
	"slack_channel_name" varchar(255),
	"notification_type" "notification_type" NOT NULL,
	"message" text NOT NULL,
	"blocks" text,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"sent_at" timestamp,
	"slack_timestamp" varchar(100),
	"related_ticket_id" uuid,
	"related_asset_id" uuid,
	"related_sla_alert_id" uuid,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints for slack_integrations
DO $$ BEGIN
 ALTER TABLE "slack_integrations" ADD CONSTRAINT "slack_integrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraints for slack_notifications
DO $$ BEGIN
 ALTER TABLE "slack_notifications" ADD CONSTRAINT "slack_notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "slack_notifications" ADD CONSTRAINT "slack_notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "slack_notifications" ADD CONSTRAINT "slack_notifications_related_ticket_id_tickets_id_fk" FOREIGN KEY ("related_ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "slack_notifications" ADD CONSTRAINT "slack_notifications_related_asset_id_assets_id_fk" FOREIGN KEY ("related_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "slack_notifications" ADD CONSTRAINT "slack_notifications_related_sla_alert_id_sla_alerts_id_fk" FOREIGN KEY ("related_sla_alert_id") REFERENCES "public"."sla_alerts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "slack_integrations_organization_id_idx" ON "slack_integrations" ("organization_id");
CREATE INDEX IF NOT EXISTS "slack_integrations_team_id_idx" ON "slack_integrations" ("team_id");
CREATE INDEX IF NOT EXISTS "slack_integrations_is_active_idx" ON "slack_integrations" ("is_active");

CREATE INDEX IF NOT EXISTS "slack_notifications_organization_id_idx" ON "slack_notifications" ("organization_id");
CREATE INDEX IF NOT EXISTS "slack_notifications_recipient_id_idx" ON "slack_notifications" ("recipient_id");
CREATE INDEX IF NOT EXISTS "slack_notifications_status_idx" ON "slack_notifications" ("status");
CREATE INDEX IF NOT EXISTS "slack_notifications_notification_type_idx" ON "slack_notifications" ("notification_type");
CREATE INDEX IF NOT EXISTS "slack_notifications_created_at_idx" ON "slack_notifications" ("created_at");

-- Add unique constraint for one integration per organization
CREATE UNIQUE INDEX IF NOT EXISTS "slack_integrations_organization_active_unique" ON "slack_integrations" ("organization_id") WHERE "is_active" = true;