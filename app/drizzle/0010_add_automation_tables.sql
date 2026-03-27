-- Add automation rule enums
DO $$ BEGIN
 CREATE TYPE "public"."automation_rule_type" AS ENUM('auto_assign', 'auto_close', 'auto_escalate', 'auto_notify');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."automation_condition_type" AS ENUM('client_match', 'priority_match', 'status_match', 'time_elapsed', 'subject_contains', 'category_match');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create automation_rules table
CREATE TABLE IF NOT EXISTS "automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"rule_type" "automation_rule_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"conditions" text NOT NULL,
	"actions" text NOT NULL,
	"created_by" uuid NOT NULL,
	"last_triggered" timestamp,
	"trigger_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create automation_rule_executions table
CREATE TABLE IF NOT EXISTS "automation_rule_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"ticket_id" uuid,
	"status" varchar(50) NOT NULL,
	"execution_data" text,
	"error_message" text,
	"executed_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "automation_rule_executions" ADD CONSTRAINT "automation_rule_executions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "automation_rule_executions" ADD CONSTRAINT "automation_rule_executions_rule_id_automation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "automation_rule_executions" ADD CONSTRAINT "automation_rule_executions_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "automation_rules_organization_id_idx" ON "automation_rules" ("organization_id");
CREATE INDEX IF NOT EXISTS "automation_rules_is_active_idx" ON "automation_rules" ("is_active");
CREATE INDEX IF NOT EXISTS "automation_rules_rule_type_idx" ON "automation_rules" ("rule_type");
CREATE INDEX IF NOT EXISTS "automation_rule_executions_organization_id_idx" ON "automation_rule_executions" ("organization_id");
CREATE INDEX IF NOT EXISTS "automation_rule_executions_rule_id_idx" ON "automation_rule_executions" ("rule_id");
CREATE INDEX IF NOT EXISTS "automation_rule_executions_executed_at_idx" ON "automation_rule_executions" ("executed_at");