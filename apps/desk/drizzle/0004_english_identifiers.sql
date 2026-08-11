CREATE TYPE "public"."department" AS ENUM('general', 'tax', 'legal', 'restructuring-insolvency', 'consulting');--> statement-breakpoint
ALTER TABLE "textbausteine" ADD COLUMN "department" "department";--> statement-breakpoint
UPDATE "textbausteine" SET "department" = CASE "bereich"::text
  WHEN 'allgemein' THEN 'general'
  WHEN 'steuerberatung' THEN 'tax'
  WHEN 'recht' THEN 'legal'
  WHEN 'sanierung-insolvenz' THEN 'restructuring-insolvency'
  WHEN 'unternehmensberatung' THEN 'consulting'
END::"department";--> statement-breakpoint
ALTER TABLE "textbausteine" ALTER COLUMN "department" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "textbausteine" ALTER COLUMN "department" SET DEFAULT 'general'::"department";--> statement-breakpoint
ALTER TABLE "textbausteine" DROP COLUMN "bereich";--> statement-breakpoint
ALTER TABLE "textbausteine" RENAME COLUMN "titel" TO "title";--> statement-breakpoint
ALTER TABLE "textbausteine" RENAME COLUMN "inhalt" TO "content";--> statement-breakpoint
ALTER TABLE "textbausteine" RENAME TO "text_blocks";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "department" "department";--> statement-breakpoint
UPDATE "users" SET "department" = CASE "bereich"::text
  WHEN 'allgemein' THEN 'general'
  WHEN 'steuerberatung' THEN 'tax'
  WHEN 'recht' THEN 'legal'
  WHEN 'sanierung-insolvenz' THEN 'restructuring-insolvency'
  WHEN 'unternehmensberatung' THEN 'consulting'
END::"department"
WHERE "bereich" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "bereich";--> statement-breakpoint
CREATE TYPE "public"."user_role_new" AS ENUM('admin', 'employee');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" TYPE "user_role_new" USING (
  CASE "role"::text
    WHEN 'mitarbeiter' THEN 'employee'::"user_role_new"
    ELSE "role"::text::"user_role_new"
  END
);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'employee';--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
ALTER TYPE "public"."user_role_new" RENAME TO "user_role";--> statement-breakpoint
DROP TYPE "public"."bereich";
