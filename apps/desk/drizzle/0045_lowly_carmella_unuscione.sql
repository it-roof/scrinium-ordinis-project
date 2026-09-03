CREATE TYPE "public"."desk_role" AS ENUM('rechtsanwalt', 'sekretariat');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "desk_role" "desk_role";