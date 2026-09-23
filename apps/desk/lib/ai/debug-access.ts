import "server-only";

import { eq } from "drizzle-orm";

import { isAiDebugEnabled } from "@/lib/ai/debug";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";

/** Slug of the only tenant allowed to use AI debug (Test Kanzlei). */
export function getAiDebugTenantSlug(): string | null {
  const slug = process.env.AI_DEBUG_TENANT_SLUG?.trim();
  return slug || null;
}

export async function resolveAiDebugTenantId(): Promise<string | null> {
  const slug = getAiDebugTenantSlug();
  if (!slug) return null;

  const rows = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  return rows[0]?.id ?? null;
}

/** Desk users of AI_DEBUG_TENANT_SLUG only — never platform super_admin. */
export async function userCanAccessAiDebug(user: {
  tenantId: string;
}): Promise<boolean> {
  if (!isAiDebugEnabled()) return false;

  const allowedTenantId = await resolveAiDebugTenantId();
  return allowedTenantId != null && user.tenantId === allowedTenantId;
}

/** Persist debug_trace only for the configured debug tenant. */
export async function shouldCaptureAiDebugTrace(
  tenantId: string
): Promise<boolean> {
  if (!isAiDebugEnabled()) return false;

  const allowedTenantId = await resolveAiDebugTenantId();
  return allowedTenantId != null && allowedTenantId === tenantId;
}
