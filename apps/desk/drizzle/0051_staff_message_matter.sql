ALTER TABLE "staff_messages" ADD COLUMN "matter_id" uuid;--> statement-breakpoint
ALTER TABLE "staff_messages" ADD CONSTRAINT "staff_messages_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_messages_matter_id_idx" ON "staff_messages" USING btree ("matter_id");
