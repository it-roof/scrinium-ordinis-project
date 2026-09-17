-- Gemeinsame Prompt-Bibliothek: nur Katalog-Tenant (Dr. Schneiderbanger) behalten.
-- Alle Prompt-/Tag-Daten anderer Kanzleien entfernen.

DELETE FROM "prompt_tag_assignments"
WHERE "prompt_id" IN (
  SELECT p."id"
  FROM "prompts" p
  WHERE p."tenant_id" <> (
    SELECT t."id" FROM "tenants" t WHERE t."slug" = 'schneiderbanger' LIMIT 1
  )
);--> statement-breakpoint

DELETE FROM "prompts"
WHERE "tenant_id" <> (
  SELECT t."id" FROM "tenants" t WHERE t."slug" = 'schneiderbanger' LIMIT 1
);--> statement-breakpoint

DELETE FROM "prompt_tags"
WHERE "tenant_id" <> (
  SELECT t."id" FROM "tenants" t WHERE t."slug" = 'schneiderbanger' LIMIT 1
);
