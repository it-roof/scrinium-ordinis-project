CREATE TYPE "public"."client_intake_invite_status" AS ENUM('open', 'submitted', 'revoked', 'expired');--> statement-breakpoint
CREATE TABLE "client_intake_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module" "module" DEFAULT 'legal' NOT NULL,
	"token_hash" text NOT NULL,
	"recipient_email" text NOT NULL,
	"recipient_name" text DEFAULT '' NOT NULL,
	"created_by" uuid NOT NULL,
	"status" "client_intake_invite_status" DEFAULT 'open' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_intake_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invite_id" uuid NOT NULL,
	"client_id" uuid,
	"party_kind" "client_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	"missing_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"signature_png" text,
	"consents" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_intake_invites" ADD CONSTRAINT "client_intake_invites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_intake_invites" ADD CONSTRAINT "client_intake_invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_intake_submissions" ADD CONSTRAINT "client_intake_submissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_intake_submissions" ADD CONSTRAINT "client_intake_submissions_invite_id_client_intake_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."client_intake_invites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_intake_submissions" ADD CONSTRAINT "client_intake_submissions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "client_intake_invites_token_hash_unique" ON "client_intake_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "client_intake_invites_tenant_id_idx" ON "client_intake_invites" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "client_intake_invites_tenant_status_idx" ON "client_intake_invites" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "client_intake_submissions_invite_id_unique" ON "client_intake_submissions" USING btree ("invite_id");--> statement-breakpoint
CREATE INDEX "client_intake_submissions_tenant_id_idx" ON "client_intake_submissions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "client_intake_submissions_client_id_idx" ON "client_intake_submissions" USING btree ("client_id");--> statement-breakpoint
ALTER TABLE "client_intake_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_client_intake_invites" ON "client_intake_invites"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );--> statement-breakpoint
ALTER TABLE "client_intake_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_client_intake_submissions" ON "client_intake_submissions"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );
