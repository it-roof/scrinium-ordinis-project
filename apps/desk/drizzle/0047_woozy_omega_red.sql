CREATE TYPE "public"."user_salutation" AS ENUM('herr', 'frau');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "salutation" "user_salutation";