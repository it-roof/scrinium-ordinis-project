CREATE TYPE "public"."platform_role" AS ENUM('super_admin');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "platform_role" "platform_role";