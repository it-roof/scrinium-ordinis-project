CREATE TYPE "public"."matter_party_role" AS ENUM('opponent', 'party', 'other');--> statement-breakpoint
CREATE TYPE "public"."ai_consent_status" AS ENUM('granted', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."ai_draft_status" AS ENUM('draft', 'approved', 'discarded');--> statement-breakpoint
CREATE TABLE "matter_parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"matter_id" uuid NOT NULL,
	"role" "matter_party_role" DEFAULT 'opponent' NOT NULL,
	"kind" "client_kind" DEFAULT 'company' NOT NULL,
	"name" text NOT NULL,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"street" text DEFAULT '' NOT NULL,
	"postal_code" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" "ai_consent_status" NOT NULL,
	"waiver_43e" boolean DEFAULT false NOT NULL,
	"granted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"evidence" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"matter_id" uuid,
	"task" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"latency_ms" integer,
	"placeholder_count" integer,
	"preview_confirmed" boolean DEFAULT false NOT NULL,
	"success" boolean NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"matter_id" uuid NOT NULL,
	"task" text NOT NULL,
	"status" "ai_draft_status" DEFAULT 'draft' NOT NULL,
	"content" text NOT NULL,
	"created_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matter_parties" ADD CONSTRAINT "matter_parties_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_parties" ADD CONSTRAINT "matter_parties_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_consents" ADD CONSTRAINT "ai_consents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_consents" ADD CONSTRAINT "ai_consents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_consents" ADD CONSTRAINT "ai_consents_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_audit" ADD CONSTRAINT "ai_audit_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_audit" ADD CONSTRAINT "ai_audit_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_audit" ADD CONSTRAINT "ai_audit_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_audit" ADD CONSTRAINT "ai_audit_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matter_parties_tenant_matter_idx" ON "matter_parties" USING btree ("tenant_id","matter_id");--> statement-breakpoint
CREATE INDEX "ai_consents_tenant_client_idx" ON "ai_consents" USING btree ("tenant_id","client_id");--> statement-breakpoint
CREATE INDEX "ai_audit_tenant_created_idx" ON "ai_audit" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_drafts_tenant_matter_idx" ON "ai_drafts" USING btree ("tenant_id","matter_id");--> statement-breakpoint
ALTER TABLE "matter_parties" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_matter_parties" ON "matter_parties"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );--> statement-breakpoint
ALTER TABLE "ai_consents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_ai_consents" ON "ai_consents"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );--> statement-breakpoint
ALTER TABLE "ai_audit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_ai_audit" ON "ai_audit"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );--> statement-breakpoint
ALTER TABLE "ai_drafts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_ai_drafts" ON "ai_drafts"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );
