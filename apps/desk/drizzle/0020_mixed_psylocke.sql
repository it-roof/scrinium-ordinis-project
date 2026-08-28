ALTER TABLE "user_smtp_settings" ALTER COLUMN "host" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_smtp_settings" ALTER COLUMN "port" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_smtp_settings" ALTER COLUMN "username" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_smtp_settings" ALTER COLUMN "password_encrypted" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_smtp_settings" ALTER COLUMN "from_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_smtp_settings" ALTER COLUMN "from_email" DROP NOT NULL;