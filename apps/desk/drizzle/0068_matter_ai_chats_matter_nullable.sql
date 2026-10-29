-- Allow Akten-Chat threads without a matter (practice-scoped, matter_id null).
ALTER TABLE "matter_ai_chats" DROP CONSTRAINT "matter_ai_chats_matter_id_matters_id_fk";--> statement-breakpoint
ALTER TABLE "matter_ai_chats" ALTER COLUMN "matter_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "matter_ai_chats" ADD CONSTRAINT "matter_ai_chats_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE set null ON UPDATE no action;
