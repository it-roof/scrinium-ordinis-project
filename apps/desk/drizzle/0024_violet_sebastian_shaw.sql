CREATE TYPE "public"."letter_status" AS ENUM('entwurf', 'zur_pruefung', 'freigegeben', 'versendet');--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "assigned_to" uuid;--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "status" "letter_status" DEFAULT 'entwurf' NOT NULL;--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "recipient_email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "letters" ADD CONSTRAINT "letters_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "letters_assigned_to_idx" ON "letters" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "letters_status_idx" ON "letters" USING btree ("status");