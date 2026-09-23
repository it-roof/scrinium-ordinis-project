import "server-only";

import { and, eq, isNotNull, lt, or } from "drizzle-orm";

import { AI_ERROR } from "@/lib/ai/errors";
import { AI_JOB_SECRETS_TTL_MS } from "@/lib/ai/limits";
import {
  aiJobs,
  type AiDebugTrace,
  type AiJob,
  type AiJobStatus,
} from "@/lib/db/schema";
import { withTenantDb } from "@/lib/tenant/db";

export type AiJobRecord = {
  id: string;
  clientId: string;
  matterId: string;
  task: string;
  status: AiJobStatus;
  draftId: string | null;
  unknownPlaceholders: string[];
  errorCode: string | null;
  previewConfirmed: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toRecord(row: AiJob): AiJobRecord {
  return {
    id: row.id,
    clientId: row.clientId,
    matterId: row.matterId,
    task: row.task,
    status: row.status,
    draftId: row.draftId,
    unknownPlaceholders: row.unknownPlaceholders ?? [],
    errorCode: row.errorCode,
    previewConfirmed: row.previewConfirmed,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function secretsCutoffIso(now = Date.now()): string {
  return new Date(now - AI_JOB_SECRETS_TTL_MS).toISOString();
}

/** Longer window for running jobs that already wiped secrets (Bedrock in flight). */
function hangCutoffIso(now = Date.now()): string {
  return new Date(now - AI_JOB_SECRETS_TTL_MS * 2).toISOString();
}

export async function createAiJob(input: {
  tenantId: string;
  userId: string;
  clientId: string;
  matterId: string;
  task: string;
  facts: string;
  manualMarks: string[];
  dismissedResiduals: string[];
  previewConfirmed: boolean;
}): Promise<AiJobRecord> {
  return withTenantDb(input.tenantId, async (tx) => {
    const [row] = await tx
      .insert(aiJobs)
      .values({
        tenantId: input.tenantId,
        userId: input.userId,
        clientId: input.clientId,
        matterId: input.matterId,
        task: input.task,
        status: "pending",
        inputFacts: input.facts,
        manualMarks: input.manualMarks,
        dismissedResiduals: input.dismissedResiduals,
        previewConfirmed: input.previewConfirmed,
      })
      .returning();
    return toRecord(row);
  });
}

/** Full row including inputFacts — only for the worker. */
export async function getAiJobRowForProcessing(
  tenantId: string,
  jobId: string
): Promise<AiJob | null> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(aiJobs)
      .where(and(eq(aiJobs.tenantId, tenantId), eq(aiJobs.id, jobId)))
      .limit(1);
    return rows[0] ?? null;
  });
}

/**
 * Wipe plaintext facts + residual marks from the job row as soon as the worker
 * has them in memory. Shrinks the Klartext-at-rest window before Bedrock returns.
 */
export async function clearAiJobInputFacts(
  tenantId: string,
  jobId: string
): Promise<void> {
  await withTenantDb(tenantId, async (tx) => {
    await tx
      .update(aiJobs)
      .set({
        inputFacts: null,
        manualMarks: [],
        dismissedResiduals: [],
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(aiJobs.tenantId, tenantId), eq(aiJobs.id, jobId)));
  });
}

export async function getAiJobRecord(
  tenantId: string,
  jobId: string
): Promise<AiJobRecord | null> {
  const row = await getAiJobRowForProcessing(tenantId, jobId);
  return row ? toRecord(row) : null;
}

/**
 * Job status for the starting user only (blocks same-tenant IDOR on drafts).
 */
export async function getAiJobRecordForOwner(
  tenantId: string,
  jobId: string,
  userId: string
): Promise<AiJobRecord | null> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(aiJobs)
      .where(
        and(
          eq(aiJobs.tenantId, tenantId),
          eq(aiJobs.id, jobId),
          eq(aiJobs.userId, userId)
        )
      )
      .limit(1);
    return rows[0] ? toRecord(rows[0]) : null;
  });
}

/**
 * Fail abandoned pending/running jobs past TTL and wipe secrets.
 * Call without a jobId on AI actions so orphaned Klartext cannot sit forever
 * when the user never polls that specific job.
 */
export async function failStaleAiJobsWithSecrets(
  tenantId: string
): Promise<number> {
  const cutoff = secretsCutoffIso();
  const hangCutoff = hangCutoffIso();
  return withTenantDb(tenantId, async (tx) => {
    const updated = await tx
      .update(aiJobs)
      .set({
        status: "failed",
        errorCode: AI_ERROR.AI_ERROR,
        inputFacts: null,
        manualMarks: [],
        dismissedResiduals: [],
        finishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(aiJobs.tenantId, tenantId),
          or(
            // Pending too long (after() never ran / tab closed)
            and(eq(aiJobs.status, "pending"), lt(aiJobs.createdAt, cutoff)),
            // Running but Klartext still at rest past TTL
            and(
              eq(aiJobs.status, "running"),
              isNotNull(aiJobs.inputFacts),
              lt(aiJobs.createdAt, cutoff)
            ),
            // Stuck after early clear (crash / hung Bedrock) — longer grace
            and(
              eq(aiJobs.status, "running"),
              lt(aiJobs.startedAt, hangCutoff)
            )
          )!
        )
      )
      .returning({ id: aiJobs.id });
    return updated.length;
  });
}

export async function markAiJobRunning(
  tenantId: string,
  jobId: string
): Promise<boolean> {
  return withTenantDb(tenantId, async (tx) => {
    const updated = await tx
      .update(aiJobs)
      .set({
        status: "running",
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(aiJobs.tenantId, tenantId),
          eq(aiJobs.id, jobId),
          eq(aiJobs.status, "pending")
        )
      )
      .returning({ id: aiJobs.id });
    return updated.length > 0;
  });
}

export async function markAiJobSucceeded(input: {
  tenantId: string;
  jobId: string;
  draftId: string;
  unknownPlaceholders: string[];
  debugTrace?: AiDebugTrace | null;
}): Promise<boolean> {
  return withTenantDb(input.tenantId, async (tx) => {
    const updated = await tx
      .update(aiJobs)
      .set({
        status: "succeeded",
        draftId: input.draftId,
        unknownPlaceholders: input.unknownPlaceholders,
        inputFacts: null,
        manualMarks: [],
        dismissedResiduals: [],
        errorCode: null,
        ...(input.debugTrace !== undefined
          ? { debugTrace: input.debugTrace }
          : {}),
        finishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(aiJobs.tenantId, input.tenantId),
          eq(aiJobs.id, input.jobId),
          eq(aiJobs.status, "running")
        )
      )
      .returning({ id: aiJobs.id });
    return updated.length > 0;
  });
}

export async function markAiJobFailed(input: {
  tenantId: string;
  jobId: string;
  errorCode: string;
  debugTrace?: AiDebugTrace | null;
}): Promise<void> {
  await withTenantDb(input.tenantId, async (tx) => {
    await tx
      .update(aiJobs)
      .set({
        status: "failed",
        errorCode: input.errorCode,
        inputFacts: null,
        manualMarks: [],
        dismissedResiduals: [],
        ...(input.debugTrace !== undefined
          ? { debugTrace: input.debugTrace }
          : {}),
        finishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(eq(aiJobs.tenantId, input.tenantId), eq(aiJobs.id, input.jobId))
      );
  });
}

/** Live debug: write partial timeline while the job is still running. */
export async function updateAiJobDebugTrace(
  tenantId: string,
  jobId: string,
  debugTrace: AiDebugTrace
): Promise<void> {
  await withTenantDb(tenantId, async (tx) => {
    await tx
      .update(aiJobs)
      .set({
        debugTrace,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(aiJobs.tenantId, tenantId), eq(aiJobs.id, jobId)));
  });
}

export async function getAiJobDebugTrace(
  tenantId: string,
  jobId: string
): Promise<AiDebugTrace | null> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select({ debugTrace: aiJobs.debugTrace })
      .from(aiJobs)
      .where(and(eq(aiJobs.tenantId, tenantId), eq(aiJobs.id, jobId)))
      .limit(1);
    return rows[0]?.debugTrace ?? null;
  });
}
