ALTER TABLE "client_persons" ADD COLUMN "salutation" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_persons" ADD COLUMN "street" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_persons" ADD COLUMN "postal_code" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_persons" ADD COLUMN "city" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_persons" ADD COLUMN "country" text DEFAULT 'Deutschland' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_persons" ADD COLUMN "mobile" text DEFAULT '' NOT NULL;