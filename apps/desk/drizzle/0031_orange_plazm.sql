CREATE TYPE "public"."client_kind" AS ENUM('company', 'person');--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "kind" "client_kind" DEFAULT 'company' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "salutation" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "first_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "last_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "mobile" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "clients_kind_idx" ON "clients" USING btree ("kind");