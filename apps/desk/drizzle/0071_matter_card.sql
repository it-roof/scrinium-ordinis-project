CREATE TYPE "public"."matter_status" AS ENUM('open', 'closed');--> statement-breakpoint
ALTER TABLE "matters" ADD COLUMN "file_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "matters" ADD COLUMN "subject" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "matters" ADD COLUMN "legal_area" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "matters" ADD COLUMN "lawyer_id" uuid;--> statement-breakpoint
ALTER TABLE "matters" ADD COLUMN "assistant_id" uuid;--> statement-breakpoint
ALTER TABLE "matters" ADD COLUMN "opened_at" date DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "matters" ADD COLUMN "status" "matter_status" DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "matters" ADD COLUMN "closed_at" date;--> statement-breakpoint
ALTER TABLE "matters" ADD COLUMN "amount_in_dispute" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "matters" ADD COLUMN "proceeding_instance" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "matters" ADD COLUMN "court_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "matters" ADD COLUMN "court_file_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_lawyer_id_users_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_assistant_id_users_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "matter_file_number_counters" (
	"tenant_id" uuid NOT NULL,
	"module" "module" NOT NULL,
	"year" integer NOT NULL,
	"last_seq" integer NOT NULL,
	CONSTRAINT "matter_file_number_counters_tenant_id_module_year_pk" PRIMARY KEY("tenant_id","module","year")
);
--> statement-breakpoint
ALTER TABLE "matter_file_number_counters" ADD CONSTRAINT "matter_file_number_counters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_file_number_counters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_matter_file_number_counters" ON "matter_file_number_counters"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint
CREATE TABLE "matter_collision_acks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"matter_id" uuid NOT NULL,
	"acknowledged_by" uuid,
	"reason" text NOT NULL,
	"matches" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matter_collision_acks" ADD CONSTRAINT "matter_collision_acks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_collision_acks" ADD CONSTRAINT "matter_collision_acks_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_collision_acks" ADD CONSTRAINT "matter_collision_acks_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matter_collision_acks_tenant_matter_idx" ON "matter_collision_acks" USING btree ("tenant_id","matter_id");--> statement-breakpoint
ALTER TABLE "matter_collision_acks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_matter_collision_acks" ON "matter_collision_acks"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint
WITH numbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "tenant_id", "module", EXTRACT(YEAR FROM "created_at" AT TIME ZONE 'Europe/Berlin')
      ORDER BY "created_at", "id"
    ) AS seq,
    EXTRACT(YEAR FROM "created_at" AT TIME ZONE 'Europe/Berlin')::integer AS year
  FROM "matters"
)
UPDATE "matters"
SET "file_number" = numbered.seq::text || '/' || numbered.year::text
FROM numbered
WHERE "matters"."id" = numbered."id";--> statement-breakpoint
INSERT INTO "matter_file_number_counters" ("tenant_id", "module", "year", "last_seq")
SELECT
  "tenant_id",
  "module",
  split_part("file_number", '/', 2)::integer,
  MAX(split_part("file_number", '/', 1)::integer)
FROM "matters"
WHERE "file_number" <> ''
GROUP BY "tenant_id", "module", split_part("file_number", '/', 2)::integer
ON CONFLICT ("tenant_id", "module", "year") DO UPDATE SET "last_seq" = EXCLUDED."last_seq";--> statement-breakpoint
CREATE UNIQUE INDEX "matters_tenant_module_file_number_idx" ON "matters" USING btree ("tenant_id","module","file_number");
