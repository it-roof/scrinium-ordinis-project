CREATE TYPE "public"."ai_job_status" AS ENUM('pending', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "ai_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"matter_id" uuid NOT NULL,
	"task" text NOT NULL,
	"status" "ai_job_status" DEFAULT 'pending' NOT NULL,
	"input_facts" text,
	"manual_marks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preview_confirmed" boolean DEFAULT false NOT NULL,
	"draft_id" uuid,
	"unknown_placeholders" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error_code" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_draft_id_ai_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."ai_drafts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_jobs_tenant_matter_idx" ON "ai_jobs" USING btree ("tenant_id","matter_id");--> statement-breakpoint
CREATE INDEX "ai_jobs_tenant_status_idx" ON "ai_jobs" USING btree ("tenant_id","status");--> statement-breakpoint
ALTER TABLE "ai_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_ai_jobs" ON "ai_jobs"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );
