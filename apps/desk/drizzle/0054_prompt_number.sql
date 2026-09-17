ALTER TABLE "prompts" ADD COLUMN "prompt_number" integer;--> statement-breakpoint
UPDATE "prompts" AS p
SET "prompt_number" = numbered.rn
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id
      ORDER BY created_at ASC, title ASC, id ASC
    )::integer AS rn
  FROM "prompts"
) AS numbered
WHERE p.id = numbered.id;--> statement-breakpoint
ALTER TABLE "prompts" ALTER COLUMN "prompt_number" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "prompts_tenant_prompt_number_unique" ON "prompts" USING btree ("tenant_id","prompt_number");
