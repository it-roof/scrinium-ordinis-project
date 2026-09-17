import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";

/** Gemeinsame Prompt-Bibliothek für alle Kunden-Kanzleien. */
export const PROMPT_CATALOG_TENANT_SLUG = "schneiderbanger";

/**
 * Tenant-ID der Katalog-Kanzlei (Dr. Schneiderbanger).
 * Alle Prompt-Reads/Writes laufen gegen diesen Tenant (RLS-Kontext).
 */
export async function getPromptCatalogTenantId(): Promise<string> {
  const [row] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, PROMPT_CATALOG_TENANT_SLUG))
    .limit(1);

  if (!row) {
    throw new Error(
      `Prompt-Katalog-Tenant fehlt (slug: ${PROMPT_CATALOG_TENANT_SLUG}).`
    );
  }

  return row.id;
}

/** Nur die Katalog-Kanzlei darf die gemeinsame Bibliothek verwalten. */
export async function canManagePromptCatalog(
  sessionTenantId: string
): Promise<boolean> {
  const catalogId = await getPromptCatalogTenantId();
  return sessionTenantId === catalogId;
}
