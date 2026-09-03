CREATE TYPE "public"."staff_message_status" AS ENUM('offen', 'erledigt');--> statement-breakpoint
CREATE TABLE "staff_message_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_messages" ADD COLUMN "status" "staff_message_status" DEFAULT 'offen' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_messages" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "staff_message_replies" ADD CONSTRAINT "staff_message_replies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_message_replies" ADD CONSTRAINT "staff_message_replies_message_id_staff_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."staff_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_message_replies" ADD CONSTRAINT "staff_message_replies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_message_replies_tenant_id_idx" ON "staff_message_replies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "staff_message_replies_message_id_idx" ON "staff_message_replies" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "staff_messages_status_idx" ON "staff_messages" USING btree ("status");