CREATE TABLE "text_block_tag_assignments" (
	"text_block_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "text_block_tag_assignments_text_block_id_tag_id_pk" PRIMARY KEY("text_block_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "text_block_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "text_block_tag_assignments" ADD CONSTRAINT "text_block_tag_assignments_text_block_id_text_blocks_id_fk" FOREIGN KEY ("text_block_id") REFERENCES "public"."text_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_block_tag_assignments" ADD CONSTRAINT "text_block_tag_assignments_tag_id_text_block_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."text_block_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_block_tags" ADD CONSTRAINT "text_block_tags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "text_block_tags_tenant_name_unique" ON "text_block_tags" USING btree ("tenant_id","name");--> statement-breakpoint
ALTER TABLE "text_block_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_text_block_tags" ON "text_block_tags"
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );