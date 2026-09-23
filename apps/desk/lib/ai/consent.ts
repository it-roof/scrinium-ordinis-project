import "server-only";

import { desc, eq, and } from "drizzle-orm";

import {
  consentStatusView,
  isAiConsentGranted,
  type ConsentStatusView,
} from "@/lib/ai/consent-status";
import { AI_ERROR, AiGatewayError } from "@/lib/ai/errors";
import { aiConsents, type AiConsent } from "@/lib/db/schema";
import { withTenantDb } from "@/lib/tenant/db";

export type { ConsentStatusView };
export { consentStatusView, isAiConsentGranted };

export async function getLatestAiConsent(
  tenantId: string,
  clientId: string
): Promise<AiConsent | null> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(aiConsents)
      .where(
        and(
          eq(aiConsents.tenantId, tenantId),
          eq(aiConsents.clientId, clientId)
        )
      )
      .orderBy(desc(aiConsents.createdAt))
      .limit(1);
    return rows[0] ?? null;
  });
}

/**
 * Throws NO_CONSENT unless the latest consent row is status=granted.
 * Enforced server-side for every AI call.
 */
export async function assertAiConsentGranted(
  tenantId: string,
  clientId: string
): Promise<AiConsent> {
  const latest = await getLatestAiConsent(tenantId, clientId);
  if (!isAiConsentGranted(latest)) {
    throw new AiGatewayError(
      AI_ERROR.NO_CONSENT,
      "AI consent not granted"
    );
  }
  return latest as AiConsent;
}

export async function recordAiConsentGranted(input: {
  tenantId: string;
  clientId: string;
  userId: string;
  waiver43e: boolean;
  evidence?: string | null;
}): Promise<AiConsent> {
  return withTenantDb(input.tenantId, async (tx) => {
    const [row] = await tx
      .insert(aiConsents)
      .values({
        tenantId: input.tenantId,
        clientId: input.clientId,
        status: "granted",
        waiver43e: input.waiver43e,
        grantedAt: new Date().toISOString(),
        evidence: input.evidence?.trim() || null,
        recordedBy: input.userId,
      })
      .returning();
    return row;
  });
}

export async function recordAiConsentRevoked(input: {
  tenantId: string;
  clientId: string;
  userId: string;
}): Promise<AiConsent> {
  return withTenantDb(input.tenantId, async (tx) => {
    const [row] = await tx
      .insert(aiConsents)
      .values({
        tenantId: input.tenantId,
        clientId: input.clientId,
        status: "revoked",
        waiver43e: false,
        revokedAt: new Date().toISOString(),
        recordedBy: input.userId,
      })
      .returning();
    return row;
  });
}
