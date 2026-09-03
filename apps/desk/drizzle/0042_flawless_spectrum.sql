ALTER TABLE "staff_messages" ALTER COLUMN "priority" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "staff_messages" ALTER COLUMN "priority" SET DEFAULT 'keine'::text;--> statement-breakpoint
UPDATE "staff_messages" SET "priority" = CASE
  WHEN "priority" = 'high' THEN 'sofort'
  WHEN "priority" = 'normal' THEN 'heute'
  WHEN "priority" = 'low' THEN 'keine'
  ELSE "priority"
END;--> statement-breakpoint
DROP TYPE "public"."staff_message_priority";--> statement-breakpoint
CREATE TYPE "public"."staff_message_priority" AS ENUM('sofort', 'heute', 'diese_woche', 'keine');--> statement-breakpoint
ALTER TABLE "staff_messages" ALTER COLUMN "priority" SET DEFAULT 'keine'::"public"."staff_message_priority";--> statement-breakpoint
ALTER TABLE "staff_messages" ALTER COLUMN "priority" SET DATA TYPE "public"."staff_message_priority" USING "priority"::"public"."staff_message_priority";
