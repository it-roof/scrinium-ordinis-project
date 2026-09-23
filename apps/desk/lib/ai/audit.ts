import "server-only";

import { aiAudit } from "@/lib/db/schema";
import { withTenantDb } from "@/lib/tenant/db";

export type WriteAiAuditInput = {
  tenantId: string;
  userId: string;
  /** Null for free-form chat (no client context). */
  clientId: string | null;
  matterId: string | null;
  task: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs?: number | null;
  placeholderCount?: number | null;
  previewConfirmed?: boolean;
  success: boolean;
  errorCode?: string | null;
};

/** Persist metadata-only audit row. Never pass prompt/response/mapping. */
export async function writeAiAudit(input: WriteAiAuditInput): Promise<void> {
  await withTenantDb(input.tenantId, async (tx) => {
    await tx.insert(aiAudit).values({
      tenantId: input.tenantId,
      userId: input.userId,
      clientId: input.clientId ?? null,
      matterId: input.matterId,
      task: input.task,
      model: input.model,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      latencyMs: input.latencyMs ?? null,
      placeholderCount: input.placeholderCount ?? null,
      previewConfirmed: input.previewConfirmed ?? false,
      success: input.success,
      errorCode: input.errorCode ?? null,
    });
  });
}
