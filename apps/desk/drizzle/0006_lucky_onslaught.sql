CREATE TABLE "prompt_tag_assignments" (
	"prompt_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "prompt_tag_assignments_prompt_id_tag_id_pk" PRIMARY KEY("prompt_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "prompt_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prompt_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "prompt_tag_assignments" ADD CONSTRAINT "prompt_tag_assignments_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_tag_assignments" ADD CONSTRAINT "prompt_tag_assignments_tag_id_prompt_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."prompt_tags"("id") ON DELETE cascade ON UPDATE no action;