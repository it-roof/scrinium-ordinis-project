-- Rename enum + columns without data loss (values unchanged).
ALTER TYPE "public"."department" RENAME TO "module";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "department" TO "module";--> statement-breakpoint
ALTER TABLE "text_blocks" RENAME COLUMN "department" TO "module";--> statement-breakpoint
ALTER TABLE "doc_pages" RENAME COLUMN "department" TO "module";
