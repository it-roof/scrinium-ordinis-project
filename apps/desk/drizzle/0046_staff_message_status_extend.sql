ALTER TYPE "public"."staff_message_status" ADD VALUE IF NOT EXISTS 'in_bearbeitung';--> statement-breakpoint
ALTER TYPE "public"."staff_message_status" ADD VALUE IF NOT EXISTS 'zurueckgestellt';
