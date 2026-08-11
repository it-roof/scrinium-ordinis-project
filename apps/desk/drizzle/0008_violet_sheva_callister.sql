-- Multi-Tenant foundation: tenants + tenant_id + seed + RLS
-- Bewusst handnachbearbeitet (Backfill bestehender Daten + Postgres RLS).

CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

-- Default-Tenant (erste Kanzlei auf der Plattform)
INSERT INTO "tenants" ("id", "name", "slug")
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Dr. Schneiderbanger & Kollegen',
  'schneiderbanger'
);
--> statement-breakpoint

ALTER TABLE "prompt_tags" DROP CONSTRAINT IF EXISTS "prompt_tags_name_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "doc_pages_slug_unique";
--> statement-breakpoint

ALTER TABLE "users" ADD COLUMN "tenant_id" uuid;
--> statement-breakpoint
ALTER TABLE "text_blocks" ADD COLUMN "tenant_id" uuid;
--> statement-breakpoint
ALTER TABLE "prompts" ADD COLUMN "tenant_id" uuid;
--> statement-breakpoint
ALTER TABLE "prompt_tags" ADD COLUMN "tenant_id" uuid;
--> statement-breakpoint
ALTER TABLE "doc_pages" ADD COLUMN "tenant_id" uuid;
--> statement-breakpoint
ALTER TABLE "doc_assets" ADD COLUMN "tenant_id" uuid;
--> statement-breakpoint

UPDATE "users" SET "tenant_id" = 'a0000000-0000-4000-8000-000000000001' WHERE "tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "text_blocks" SET "tenant_id" = 'a0000000-0000-4000-8000-000000000001' WHERE "tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "prompts" SET "tenant_id" = 'a0000000-0000-4000-8000-000000000001' WHERE "tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "prompt_tags" SET "tenant_id" = 'a0000000-0000-4000-8000-000000000001' WHERE "tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "doc_pages" SET "tenant_id" = 'a0000000-0000-4000-8000-000000000001' WHERE "tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "doc_assets" SET "tenant_id" = 'a0000000-0000-4000-8000-000000000001' WHERE "tenant_id" IS NULL;
--> statement-breakpoint

ALTER TABLE "users" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "text_blocks" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "prompts" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "prompt_tags" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "doc_pages" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "doc_assets" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "text_blocks" ADD CONSTRAINT "text_blocks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "prompt_tags" ADD CONSTRAINT "prompt_tags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "doc_pages" ADD CONSTRAINT "doc_pages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "doc_assets" ADD CONSTRAINT "doc_assets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE UNIQUE INDEX "doc_pages_tenant_slug_unique" ON "doc_pages" USING btree ("tenant_id","slug");
--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_tags_tenant_name_unique" ON "prompt_tags" USING btree ("tenant_id","name");
--> statement-breakpoint

CREATE INDEX "users_tenant_id_idx" ON "users" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "text_blocks_tenant_id_idx" ON "text_blocks" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "prompts_tenant_id_idx" ON "prompts" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "doc_pages_tenant_id_idx" ON "doc_pages" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "doc_assets_tenant_id_idx" ON "doc_assets" USING btree ("tenant_id");
--> statement-breakpoint

-- Postgres RLS: zweite Isolationslinie auf Fachdaten
-- (users bewusst ohne RLS — Login muss per E-Mail global auflösbar sein;
--  Tenant-Zuordnung kommt users.tenant_id + App-Scope.)
ALTER TABLE "text_blocks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "prompts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "prompt_tags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "doc_pages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "doc_assets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "tenant_isolation_text_blocks" ON "text_blocks"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );
--> statement-breakpoint

CREATE POLICY "tenant_isolation_prompts" ON "prompts"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );
--> statement-breakpoint

CREATE POLICY "tenant_isolation_prompt_tags" ON "prompt_tags"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );
--> statement-breakpoint

CREATE POLICY "tenant_isolation_doc_pages" ON "doc_pages"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );
--> statement-breakpoint

CREATE POLICY "tenant_isolation_doc_assets" ON "doc_assets"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );
