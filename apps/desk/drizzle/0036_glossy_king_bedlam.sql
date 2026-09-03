CREATE TYPE "public"."staff_message_priority" AS ENUM('low', 'normal', 'high');--> statement-breakpoint
CREATE TABLE "staff_message_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_message_files_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "staff_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module" "module" DEFAULT 'general' NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"topic_key" text NOT NULL,
	"topic" text NOT NULL,
	"priority" "staff_message_priority" DEFAULT 'normal' NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_message_files" ADD CONSTRAINT "staff_message_files_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_message_files" ADD CONSTRAINT "staff_message_files_message_id_staff_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."staff_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_message_files" ADD CONSTRAINT "staff_message_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_messages" ADD CONSTRAINT "staff_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_messages" ADD CONSTRAINT "staff_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_messages" ADD CONSTRAINT "staff_messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_messages_tenant_id_idx" ON "staff_messages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "staff_messages_recipient_idx" ON "staff_messages" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "staff_messages_sender_idx" ON "staff_messages" USING btree ("sender_id");