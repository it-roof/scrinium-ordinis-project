ALTER TABLE "users" ADD COLUMN "first_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE "users"
SET
  "last_name" = CASE
    WHEN trim("name") = '' THEN ''
    WHEN position(' ' in trim("name")) = 0 THEN trim("name")
    ELSE regexp_replace(trim("name"), '^.*[[:space:]]+', '')
  END,
  "first_name" = CASE
    WHEN trim("name") = '' THEN ''
    WHEN position(' ' in trim("name")) = 0 THEN ''
    ELSE regexp_replace(trim("name"), '[[:space:]]+\S+$', '')
  END
WHERE coalesce(trim("name"), '') <> '';--> statement-breakpoint
UPDATE "users"
SET "name" = trim(both FROM concat_ws(' ', nullif(trim("first_name"), ''), nullif(trim("last_name"), '')))
WHERE coalesce(trim("first_name"), '') <> '' OR coalesce(trim("last_name"), '') <> '';
