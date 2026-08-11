ALTER TABLE "tenants" ALTER COLUMN "enabled_modules" SET DEFAULT '["tax","legal","restructuring-insolvency","consulting"]'::jsonb;--> statement-breakpoint
UPDATE "tenants" SET "enabled_modules" = '["tax","legal","restructuring-insolvency","consulting"]'::jsonb;
