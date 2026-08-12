ALTER TABLE "doc_tags" ADD COLUMN "color" text DEFAULT 'sky' NOT NULL;--> statement-breakpoint
WITH ranked AS (
  SELECT
    id,
    (
      ARRAY[
        'sky',
        'violet',
        'amber',
        'rose',
        'emerald',
        'orange',
        'teal',
        'fuchsia',
        'lime',
        'indigo'
      ]
    )[
      ((ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, name) - 1) % 10) + 1
    ] AS next_color
  FROM "doc_tags"
)
UPDATE "doc_tags" AS t
SET "color" = ranked.next_color
FROM ranked
WHERE t.id = ranked.id;
