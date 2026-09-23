import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  aiJobs,
  tenants,
  type AiDebugTrace,
  type AiJobStatus,
} from "@/lib/db/schema";

export type AiDebugJobListItem = {
  id: string;
  tenantId: string;
  tenantName: string;
  task: string;
  status: AiJobStatus;
  errorCode: string | null;
  hasDebugTrace: boolean;
  createdAt: string;
  finishedAt: string | null;
};

export type AiDebugJobDetail = {
  id: string;
  tenantId: string;
  tenantName: string;
  userId: string;
  clientId: string;
  matterId: string;
  task: string;
  status: AiJobStatus;
  errorCode: string | null;
  draftId: string | null;
  previewConfirmed: boolean;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  debugTrace: AiDebugTrace | null;
};

function mapListRow(r: {
  id: string;
  tenantId: string;
  tenantName: string;
  task: string;
  status: AiJobStatus;
  errorCode: string | null;
  debugTrace: AiDebugTrace | null;
  createdAt: string;
  finishedAt: string | null;
}): AiDebugJobListItem {
  return {
    id: r.id,
    tenantId: r.tenantId,
    tenantName: r.tenantName,
    task: r.task,
    status: r.status,
    errorCode: r.errorCode,
    hasDebugTrace: r.debugTrace != null,
    createdAt: r.createdAt,
    finishedAt: r.finishedAt,
  };
}

/**
 * Recent AI jobs for the debug tenant. Always pass tenantId (Test Kanzlei).
 * Table owner bypasses RLS for this read.
 */
export async function listAiDebugJobs(options?: {
  limit?: number;
  tenantId?: string;
}): Promise<AiDebugJobListItem[]> {
  const limit = options?.limit ?? 50;
  const tenantId = options?.tenantId;

  const baseQuery = db
    .select({
      id: aiJobs.id,
      tenantId: aiJobs.tenantId,
      tenantName: tenants.name,
      task: aiJobs.task,
      status: aiJobs.status,
      errorCode: aiJobs.errorCode,
      debugTrace: aiJobs.debugTrace,
      createdAt: aiJobs.createdAt,
      finishedAt: aiJobs.finishedAt,
    })
    .from(aiJobs)
    .innerJoin(tenants, eq(aiJobs.tenantId, tenants.id));

  const rows = tenantId
    ? await baseQuery
        .where(eq(aiJobs.tenantId, tenantId))
        .orderBy(desc(aiJobs.createdAt))
        .limit(limit)
    : await baseQuery.orderBy(desc(aiJobs.createdAt)).limit(limit);

  return rows.map(mapListRow);
}

export async function getAiDebugJob(
  jobId: string,
  options?: { tenantId?: string }
): Promise<AiDebugJobDetail | null> {
  const rows = await db
    .select({
      id: aiJobs.id,
      tenantId: aiJobs.tenantId,
      tenantName: tenants.name,
      userId: aiJobs.userId,
      clientId: aiJobs.clientId,
      matterId: aiJobs.matterId,
      task: aiJobs.task,
      status: aiJobs.status,
      errorCode: aiJobs.errorCode,
      draftId: aiJobs.draftId,
      previewConfirmed: aiJobs.previewConfirmed,
      createdAt: aiJobs.createdAt,
      startedAt: aiJobs.startedAt,
      finishedAt: aiJobs.finishedAt,
      debugTrace: aiJobs.debugTrace,
    })
    .from(aiJobs)
    .innerJoin(tenants, eq(aiJobs.tenantId, tenants.id))
    .where(
      options?.tenantId
        ? and(eq(aiJobs.id, jobId), eq(aiJobs.tenantId, options.tenantId))
        : eq(aiJobs.id, jobId)
    )
    .limit(1);

  const r = rows[0];
  if (!r) return null;

  return {
    id: r.id,
    tenantId: r.tenantId,
    tenantName: r.tenantName,
    userId: r.userId,
    clientId: r.clientId,
    matterId: r.matterId,
    task: r.task,
    status: r.status,
    errorCode: r.errorCode,
    draftId: r.draftId,
    previewConfirmed: r.previewConfirmed,
    createdAt: r.createdAt,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    debugTrace: r.debugTrace ?? null,
  };
}
