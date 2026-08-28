ALTER TABLE "client_persons" ADD COLUMN "first_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_persons" ADD COLUMN "last_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE "client_persons" SET "last_name" = "name" WHERE coalesce("name", '') <> '';--> statement-breakpoint
ALTER TABLE "client_persons" DROP COLUMN "name";
