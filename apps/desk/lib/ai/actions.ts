"use server";

import { after } from "next/server";

import { assertAiConsentGranted } from "@/lib/ai/consent";
import { loadMatterAiContext } from "@/lib/ai/context";
import { getAiDraftById } from "@/lib/ai/drafts-storage";
import { userCanAccessAiDebug } from "@/lib/ai/debug-access";
import {
  AI_ERROR,
  AiGatewayError,
  userMessageForAiError,
  type AiErrorCode,
} from "@/lib/ai/errors";
import {
  createAiJob,
  failStaleAiJobsWithSecrets,
  getAiJobDebugTrace,
  getAiJobRecordForOwner,
  type AiJobRecord,
} from "@/lib/ai/jobs-storage";
import {
  assertResidualsCleared,
  runPseudonymPipeline,
} from "@/lib/ai/pipeline";
import { processAiJob } from "@/lib/ai/process-job";
import { CASE_FACTS_ANALYSIS_TASK } from "@/lib/ai/prompts/case-facts-analysis";
import type { AiDraftRecord } from "@/lib/ai/drafts-storage";
import type { PseudonymGatePolicy } from "@/lib/ai/gate-policy";
import { AI_FACTS_MAX_CHARS } from "@/lib/ai/limits";
import type { AiDebugTrace } from "@/lib/db/schema";
import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";

export type PreviewCaseFactsResult =
  | {
      success: true;
      pseudonymizedText: string;
      placeholderCount: number;
      clientId: string;
      entityLabels: string[];
      stage1Text: string;
      stage1PlaceholderCount: number;
      nerLabels: string[];
      residuals: string[];
      gatePolicy: PseudonymGatePolicy;
    }
  | { success: false; error: string; code: AiErrorCode };

export type StartCaseFactsJobResult =
  | { success: true; jobId: string }
  | { success: false; error: string; code: AiErrorCode };

export type GetAiJobStatusResult =
  | {
      success: true;
      job: AiJobRecord;
      draft: AiDraftRecord | null;
      errorMessage?: string;
      debugTrace?: AiDebugTrace | null;
    }
  | { success: false; error: string; code: AiErrorCode };

async function requireAiUser() {
  const user = await requireSessionUser();
  if (!user) {
    return {
      error: userMessageForAiError(AI_ERROR.FORBIDDEN),
      code: AI_ERROR.FORBIDDEN as AiErrorCode,
      user: null,
    };
  }
  const deniedAnalysis = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "case-facts-analysis"
  );
  if (!deniedAnalysis) {
    return { error: null, code: null, user };
  }
  const deniedMatters = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "matters"
  );
  if (!deniedMatters) {
    return { error: null, code: null, user };
  }
  const deniedClients = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "clients"
  );
  if (deniedClients) {
    return {
      error: userMessageForAiError(AI_ERROR.FORBIDDEN),
      code: AI_ERROR.FORBIDDEN as AiErrorCode,
      user: null,
    };
  }
  return { error: null, code: null, user };
}

/**
 * Return pseudonymized text (Stufe 1+2) + residuals for lawyer review.
 */
export async function previewCaseFactsAnalysis(input: {
  matterId: string;
  facts: string;
  manualMarks?: string[];
  dismissedResiduals?: string[];
}): Promise<PreviewCaseFactsResult> {
  const { user, error, code } = await requireAiUser();
  if (!user) {
    return {
      success: false,
      error: error ?? userMessageForAiError(AI_ERROR.FORBIDDEN),
      code: code ?? AI_ERROR.FORBIDDEN,
    };
  }

  const facts = input.facts?.trim() ?? "";
  if (!input.matterId?.trim() || !facts) {
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.VALIDATION),
      code: AI_ERROR.VALIDATION,
    };
  }

  if (facts.length > AI_FACTS_MAX_CHARS) {
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.VALIDATION),
      code: AI_ERROR.VALIDATION,
    };
  }

  try {
    await failStaleAiJobsWithSecrets(user.tenantId);
    const ctx = await loadMatterAiContext(user.tenantId, input.matterId.trim());
    await assertAiConsentGranted(user.tenantId, ctx.clientId);
    const pipeline = runPseudonymPipeline(facts, ctx.entities, {
      manualMarks: input.manualMarks,
      dismissedResiduals: input.dismissedResiduals,
    });
    const debugUi = await userCanAccessAiDebug({ tenantId: user.tenantId });
    return {
      success: true,
      pseudonymizedText: pipeline.text,
      placeholderCount: pipeline.placeholderCount,
      clientId: ctx.clientId,
      residuals: pipeline.residuals,
      gatePolicy: pipeline.gatePolicy,
      entityLabels: debugUi
        ? ctx.entities.map((e) => `${e.type}:${e.value}`)
        : [],
      stage1Text: debugUi ? pipeline.stage1Text : "",
      stage1PlaceholderCount: debugUi ? pipeline.stage1PlaceholderCount : 0,
      nerLabels: debugUi
        ? pipeline.nerEntities.map((e) => `${e.type}:${e.value}`)
        : [],
    };
  } catch (err) {
    if (err instanceof AiGatewayError) {
      return {
        success: false,
        error: userMessageForAiError(err.code),
        code: err.code,
      };
    }
    console.error("[ai/preview]", "UnknownError");
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.AI_ERROR),
      code: AI_ERROR.AI_ERROR,
    };
  }
}

/**
 * Start async case-facts analysis. Enforces residual gate when policy=block.
 */
export async function startCaseFactsAnalysisJob(input: {
  matterId: string;
  facts: string;
  manualMarks?: string[];
  dismissedResiduals?: string[];
  previewConfirmed?: boolean;
}): Promise<StartCaseFactsJobResult> {
  const { user, error, code } = await requireAiUser();
  if (!user) {
    return {
      success: false,
      error: error ?? userMessageForAiError(AI_ERROR.FORBIDDEN),
      code: code ?? AI_ERROR.FORBIDDEN,
    };
  }

  const facts = input.facts?.trim() ?? "";
  if (!input.matterId?.trim() || !facts) {
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.VALIDATION),
      code: AI_ERROR.VALIDATION,
    };
  }

  if (facts.length > AI_FACTS_MAX_CHARS) {
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.VALIDATION),
      code: AI_ERROR.VALIDATION,
    };
  }

  if (!input.previewConfirmed) {
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.VALIDATION),
      code: AI_ERROR.VALIDATION,
    };
  }

  try {
    await failStaleAiJobsWithSecrets(user.tenantId);
    const ctx = await loadMatterAiContext(user.tenantId, input.matterId.trim());
    await assertAiConsentGranted(user.tenantId, ctx.clientId);

    const pipeline = runPseudonymPipeline(facts, ctx.entities, {
      manualMarks: input.manualMarks,
      dismissedResiduals: input.dismissedResiduals,
    });
    const gate = assertResidualsCleared(
      pipeline.residuals,
      pipeline.gatePolicy
    );
    if (!gate.ok) {
      return {
        success: false,
        error: userMessageForAiError(AI_ERROR.RESIDUAL_PII),
        code: AI_ERROR.RESIDUAL_PII,
      };
    }

    const job = await createAiJob({
      tenantId: user.tenantId,
      userId: user.id,
      clientId: ctx.clientId,
      matterId: ctx.matterId,
      task: CASE_FACTS_ANALYSIS_TASK,
      facts,
      manualMarks: pipeline.appliedMarks,
      dismissedResiduals: pipeline.appliedDismissals,
      previewConfirmed: true,
    });

    const tenantId = user.tenantId;
    const jobId = job.id;
    after(async () => {
      try {
        await processAiJob(tenantId, jobId);
      } catch {
        console.error("[ai/job]", "PROCESS_UNCAUGHT");
      }
    });

    return { success: true, jobId: job.id };
  } catch (err) {
    if (err instanceof AiGatewayError) {
      return {
        success: false,
        error: userMessageForAiError(err.code),
        code: err.code,
      };
    }
    console.error("[ai/job]", "START_FAILED");
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.AI_ERROR),
      code: AI_ERROR.AI_ERROR,
    };
  }
}

/** Poll job status (and draft when succeeded). */
export async function getAiJobStatus(
  jobId: string
): Promise<GetAiJobStatusResult> {
  const { user, error, code } = await requireAiUser();
  if (!user) {
    return {
      success: false,
      error: error ?? userMessageForAiError(AI_ERROR.FORBIDDEN),
      code: code ?? AI_ERROR.FORBIDDEN,
    };
  }

  if (!jobId?.trim()) {
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.VALIDATION),
      code: AI_ERROR.VALIDATION,
    };
  }

  await failStaleAiJobsWithSecrets(user.tenantId);

  const job = await getAiJobRecordForOwner(
    user.tenantId,
    jobId.trim(),
    user.id
  );
  if (!job) {
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.FORBIDDEN),
      code: AI_ERROR.FORBIDDEN,
    };
  }

  let draft: AiDraftRecord | null = null;
  if (job.draftId) {
    draft = await getAiDraftById(user.tenantId, job.draftId);
  }

  const errorMessage =
    job.status === "failed" && job.errorCode
      ? userMessageForAiError(job.errorCode as AiErrorCode)
      : job.status === "failed"
        ? userMessageForAiError(AI_ERROR.AI_ERROR)
        : undefined;

  let debugTrace: AiDebugTrace | null | undefined;
  if (await userCanAccessAiDebug({ tenantId: user.tenantId })) {
    debugTrace = await getAiJobDebugTrace(user.tenantId, job.id);
  }

  return { success: true, job, draft, errorMessage, debugTrace };
}

/**
 * @deprecated Prefer startCaseFactsAnalysisJob + getAiJobStatus.
 */
export async function analyzeCaseFacts(input: {
  matterId: string;
  facts: string;
  manualMarks?: string[];
  dismissedResiduals?: string[];
  previewConfirmed?: boolean;
}): Promise<StartCaseFactsJobResult> {
  return startCaseFactsAnalysisJob(input);
}
