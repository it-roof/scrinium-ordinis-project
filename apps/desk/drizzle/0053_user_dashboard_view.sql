CREATE TYPE "public"."dashboard_view" AS ENUM('quick', 'all');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dashboard_view" "dashboard_view" DEFAULT 'quick' NOT NULL;
