ALTER TYPE "public"."module" ADD VALUE 'administration';--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "enabled_modules" SET DEFAULT '["legal","tax","restructuring-insolvency","administration"]'::jsonb;--> statement-breakpoint
UPDATE "tenants"
SET "enabled_modules" = COALESCE(
  (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements("enabled_modules") AS elem
    WHERE elem #>> '{}' <> 'consulting'
  ),
  '[]'::jsonb
);--> statement-breakpoint
UPDATE "tenants"
SET "enabled_modules" = "enabled_modules" || '["administration"]'::jsonb
WHERE NOT ("enabled_modules" @> '["administration"]'::jsonb);