CREATE TYPE "public"."bereich" AS ENUM('allgemein', 'steuerberatung', 'recht', 'sanierung-insolvenz', 'unternehmensberatung');--> statement-breakpoint
CREATE TABLE "textbausteine" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titel" text NOT NULL,
	"inhalt" text NOT NULL,
	"bereich" "bereich" DEFAULT 'allgemein' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
