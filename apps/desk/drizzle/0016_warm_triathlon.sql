CREATE TABLE "doc_tag_assignments" (
	"page_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "doc_tag_assignments_page_id_tag_id_pk" PRIMARY KEY("page_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "doc_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "doc_tag_assignments" ADD CONSTRAINT "doc_tag_assignments_page_id_doc_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."doc_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_tag_assignments" ADD CONSTRAINT "doc_tag_assignments_tag_id_doc_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."doc_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_tags" ADD CONSTRAINT "doc_tags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "doc_tags_tenant_name_unique" ON "doc_tags" USING btree ("tenant_id","name");--> statement-breakpoint
ALTER TABLE "doc_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_doc_tags" ON "doc_tags"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );