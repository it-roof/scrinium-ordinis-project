ALTER TABLE "staff_messages" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "staff_messages" ALTER COLUMN "status" SET DEFAULT 'offen'::text;--> statement-breakpoint
UPDATE "staff_messages" SET "status" = 'offen' WHERE "status" = 'in_bearbeitung';--> statement-breakpoint
UPDATE "staff_messages" SET "status" = 'entfaellt' WHERE "status" = 'zurueckgestellt';--> statement-breakpoint
DROP TYPE "public"."staff_message_status";--> statement-breakpoint
CREATE TYPE "public"."staff_message_status" AS ENUM('offen', 'spaeter', 'erledigt', 'entfaellt');--> statement-breakpoint
ALTER TABLE "staff_messages" ALTER COLUMN "status" SET DEFAULT 'offen'::"public"."staff_message_status";--> statement-breakpoint
ALTER TABLE "staff_messages" ALTER COLUMN "status" SET DATA TYPE "public"."staff_message_status" USING "status"::"public"."staff_message_status";
