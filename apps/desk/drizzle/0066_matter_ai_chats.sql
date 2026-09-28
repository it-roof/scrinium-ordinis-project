CREATE TABLE "matter_ai_chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"matter_id" uuid NOT NULL,
	"module" "module" DEFAULT 'legal' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"letter_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matter_ai_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"chat_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"action_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matter_ai_chats" ADD CONSTRAINT "matter_ai_chats_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_ai_chats" ADD CONSTRAINT "matter_ai_chats_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_ai_chats" ADD CONSTRAINT "matter_ai_chats_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_ai_chats" ADD CONSTRAINT "matter_ai_chats_letter_id_letters_id_fk" FOREIGN KEY ("letter_id") REFERENCES "public"."letters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_ai_chat_messages" ADD CONSTRAINT "matter_ai_chat_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_ai_chat_messages" ADD CONSTRAINT "matter_ai_chat_messages_chat_id_matter_ai_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."matter_ai_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matter_ai_chats_tenant_matter_idx" ON "matter_ai_chats" USING btree ("tenant_id","matter_id");--> statement-breakpoint
CREATE INDEX "matter_ai_chats_tenant_matter_updated_idx" ON "matter_ai_chats" USING btree ("tenant_id","matter_id","updated_at");--> statement-breakpoint
CREATE INDEX "matter_ai_chat_messages_tenant_chat_idx" ON "matter_ai_chat_messages" USING btree ("tenant_id","chat_id");--> statement-breakpoint
CREATE INDEX "matter_ai_chat_messages_tenant_chat_created_idx" ON "matter_ai_chat_messages" USING btree ("tenant_id","chat_id","created_at");--> statement-breakpoint
ALTER TABLE "matter_ai_chats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_matter_ai_chats" ON "matter_ai_chats"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );--> statement-breakpoint
ALTER TABLE "matter_ai_chat_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_matter_ai_chat_messages" ON "matter_ai_chat_messages"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );
