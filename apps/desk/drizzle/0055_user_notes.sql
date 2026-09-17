CREATE TABLE "user_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_notes_tenant_user_idx" ON "user_notes" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "user_notes_tenant_user_updated_idx" ON "user_notes" USING btree ("tenant_id","user_id","updated_at");--> statement-breakpoint
ALTER TABLE "user_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "owner_isolation_user_notes" ON "user_notes"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
    AND "user_id"::text = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
    AND "user_id"::text = current_setting('app.current_user_id', true)
  );
