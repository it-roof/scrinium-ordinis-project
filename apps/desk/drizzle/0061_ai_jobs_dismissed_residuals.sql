ALTER TABLE "ai_jobs" ADD COLUMN "dismissed_residuals" jsonb DEFAULT '[]'::jsonb NOT NULL;
