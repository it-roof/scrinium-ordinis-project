ALTER TABLE "letters" ADD COLUMN "assigned_by" uuid;--> statement-breakpoint
ALTER TABLE "letters" ADD CONSTRAINT "letters_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "letters_assigned_by_idx" ON "letters" USING btree ("assigned_by");