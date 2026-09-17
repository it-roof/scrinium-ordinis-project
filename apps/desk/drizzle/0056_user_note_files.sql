CREATE TABLE "user_note_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_note_files_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
ALTER TABLE "user_note_files" ADD CONSTRAINT "user_note_files_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note_files" ADD CONSTRAINT "user_note_files_note_id_user_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."user_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note_files" ADD CONSTRAINT "user_note_files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_note_files_tenant_user_idx" ON "user_note_files" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "user_note_files_note_id_idx" ON "user_note_files" USING btree ("note_id");--> statement-breakpoint
ALTER TABLE "user_note_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "owner_isolation_user_note_files" ON "user_note_files"
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
