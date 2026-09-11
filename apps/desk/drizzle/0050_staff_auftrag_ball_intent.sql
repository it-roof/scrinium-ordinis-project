CREATE TYPE "public"."staff_message_intent" AS ENUM('erledigen', 'pruefen', 'kenntnis', 'warten');--> statement-breakpoint
CREATE TYPE "public"."staff_message_event_kind" AS ENUM('angelegt', 'uebergeben', 'abgeschlossen');--> statement-breakpoint
ALTER TABLE "staff_messages" ADD COLUMN "previous_ball_holder_id" uuid;--> statement-breakpoint
ALTER TABLE "staff_messages" ADD COLUMN "intent" "public"."staff_message_intent" DEFAULT 'erledigen' NOT NULL;--> statement-breakpoint
UPDATE "staff_messages" SET "previous_ball_holder_id" = "sender_id";--> statement-breakpoint
UPDATE "staff_messages" SET "intent" = 'kenntnis' WHERE "topic_key" IN ('notiz');--> statement-breakpoint
UPDATE "staff_messages" SET "completed_at" = COALESCE("completed_at", now()) WHERE "status" = 'erledigt' AND "completed_at" IS NULL;--> statement-breakpoint
UPDATE "staff_messages" SET "completed_at" = NULL WHERE "status" <> 'erledigt';--> statement-breakpoint
ALTER TABLE "staff_messages" ADD CONSTRAINT "staff_messages_previous_ball_holder_id_users_id_fk" FOREIGN KEY ("previous_ball_holder_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_messages" DROP COLUMN "status";--> statement-breakpoint
DROP INDEX IF EXISTS "staff_messages_status_idx";--> statement-breakpoint
CREATE INDEX "staff_messages_closed_at_idx" ON "staff_messages" USING btree ("completed_at");--> statement-breakpoint
DROP TYPE "public"."staff_message_status";--> statement-breakpoint
CREATE TABLE "staff_message_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"kind" "public"."staff_message_event_kind" NOT NULL,
	"actor_id" uuid NOT NULL,
	"from_ball_holder_id" uuid,
	"to_ball_holder_id" uuid,
	"intent" "public"."staff_message_intent",
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "staff_message_events" ADD CONSTRAINT "staff_message_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_message_events" ADD CONSTRAINT "staff_message_events_message_id_staff_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."staff_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_message_events" ADD CONSTRAINT "staff_message_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_message_events" ADD CONSTRAINT "staff_message_events_from_ball_holder_id_users_id_fk" FOREIGN KEY ("from_ball_holder_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_message_events" ADD CONSTRAINT "staff_message_events_to_ball_holder_id_users_id_fk" FOREIGN KEY ("to_ball_holder_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_message_events_tenant_id_idx" ON "staff_message_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "staff_message_events_message_id_idx" ON "staff_message_events" USING btree ("message_id");--> statement-breakpoint
INSERT INTO "staff_message_events" ("tenant_id", "message_id", "kind", "actor_id", "from_ball_holder_id", "to_ball_holder_id", "intent", "comment", "created_at")
SELECT m."tenant_id", m."id", 'angelegt'::"public"."staff_message_event_kind", m."sender_id", NULL, m."recipient_id", m."intent", NULL, m."created_at"
FROM "staff_messages" m;--> statement-breakpoint
INSERT INTO "staff_message_events" ("tenant_id", "message_id", "kind", "actor_id", "from_ball_holder_id", "to_ball_holder_id", "intent", "comment", "created_at")
SELECT r."tenant_id", r."message_id", 'uebergeben'::"public"."staff_message_event_kind", r."author_id", NULL, NULL, NULL, r."body", r."created_at"
FROM "staff_message_replies" r;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_staff_message_replies" ON "staff_message_replies";--> statement-breakpoint
DROP TABLE "staff_message_replies";--> statement-breakpoint
ALTER TABLE "staff_message_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_staff_message_events" ON "staff_message_events"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );
