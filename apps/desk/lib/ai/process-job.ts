import "server-only";

import { writeAiAudit } from "@/lib/ai/audit";
import { askClaude, getBedrockModelId } from "@/lib/ai/bedrock";
import { assertAiConsentGranted } from "@/lib/ai/consent";
import { loadMatterAiContext } from "@/lib/ai/context";
import { createDebugTraceBuilder } from "@/lib/ai/debug";
import { shouldCaptureAiDebugTrace } from "@/lib/ai/debug-access";
import { createAiDraft } from "@/lib/ai/drafts-storage";
import { AI_ERROR, AiGatewayError } from "@/lib/ai/errors";
import {
  clearAiJobInputFacts,
  failStaleAiJobsWithSecrets,
  getAiJobRowForProcessing,
  markAiJobFailed,
  markAiJobRunning,
  markAiJobSucceeded,
  updateAiJobDebugTrace,
} from "@/lib/ai/jobs-storage";
import {
  assertResidualsCleared,
  runPseudonymPipeline,
} from "@/lib/ai/pipeline";
import { repersonalize } from "@/lib/ai/pseudonymize";
import {
  buildCaseFactsAnalysisSystemPrompt,
  buildCaseFactsUserMessage,
  CASE_FACTS_ANALYSIS_MAX_TOKENS,
  CASE_FACTS_ANALYSIS_TASK,
} from "@/lib/ai/prompts/case-facts-analysis";
import type { AiDebugTrace } from "@/lib/db/schema";

/**
 * Process one AI job. Safe to call from `after()` — never logs facts/prompts.
 * Re-checks consent at run time (revocation between start and run).
 * Clears plaintext input_facts from DB as soon as loaded into memory.
 */
export async function processAiJob(
  tenantId: string,
  jobId: string
): Promise<void> {
  const claimed = await markAiJobRunning(tenantId, jobId);
  if (!claimed) {
    // Reap abandoned jobs in this tenant (e.g. after() never ran)
    await failStaleAiJobsWithSecrets(tenantId);
    return;
  }

  const captureDebug = await shouldCaptureAiDebugTrace(tenantId);
  const debug = captureDebug ? createDebugTraceBuilder() : null;
  let traceExtra: Omit<AiDebugTrace, "steps"> = {};

  async function flushDebug() {
    if (!debug) return;
    try {
      await updateAiJobDebugTrace(tenantId, jobId, debug.build(traceExtra));
    } catch {
      console.error("[ai/job]", "DEBUG_FLUSH_FAILED");
    }
  }

  debug?.push("claimed");
  await flushDebug();

  const job = await getAiJobRowForProcessing(tenantId, jobId);
  if (!job || !job.inputFacts?.trim()) {
    await markAiJobFailed({
      tenantId,
      jobId,
      errorCode: AI_ERROR.VALIDATION,
      debugTrace: debug?.build({ errorCode: AI_ERROR.VALIDATION }) ?? undefined,
    });
    return;
  }

  const inputFacts = job.inputFacts;
  const marks = job.manualMarks ?? [];
  const dismissed = job.dismissedResiduals ?? [];
  // Shrink Klartext-at-rest window before Bedrock returns (facts + marks)
  await clearAiJobInputFacts(tenantId, jobId);
  debug?.push("input_facts_cleared");
  await flushDebug();

  let modelForAudit = "unset";
  try {
    modelForAudit = getBedrockModelId();
  } catch {
    modelForAudit = "unset";
  }

  try {
    debug?.push("load_context");
    await flushDebug();
    const ctx = await loadMatterAiContext(tenantId, job.matterId);
    if (ctx.clientId !== job.clientId) {
      throw new AiGatewayError(AI_ERROR.FORBIDDEN, "Client mismatch");
    }

    debug?.push("assert_consent");
    await flushDebug();
    await assertAiConsentGranted(tenantId, ctx.clientId);

    debug?.push(
      "pseudonymize",
      `stufe1=${ctx.entities.length} db · marks=${marks.length}`
    );
    const pipeline = runPseudonymPipeline(inputFacts, ctx.entities, {
      manualMarks: marks,
      dismissedResiduals: dismissed,
    });
    debug?.push(
      "ner_local",
      `${pipeline.nerEntities.length} ner · ${pipeline.residuals.length} residuals · gate=${pipeline.gatePolicy}`
    );
    await flushDebug();

    const gate = assertResidualsCleared(
      pipeline.residuals,
      pipeline.gatePolicy
    );
    if (!gate.ok) {
      throw new AiGatewayError(AI_ERROR.RESIDUAL_PII, "Residuals uncleared");
    }

    const pseudoText = pipeline.text;
    const mapping = pipeline.mapping;
    const placeholderCount = pipeline.placeholderCount;

    const userMessage = buildCaseFactsUserMessage(pseudoText);
    traceExtra = {
      pseudonymizedUserMessage: userMessage,
      placeholderCount,
      model: modelForAudit,
    };
    await flushDebug();

    debug?.push("bedrock_call", modelForAudit);
    await flushDebug();
    const result = await askClaude({
      system: buildCaseFactsAnalysisSystemPrompt(),
      user: userMessage,
      maxTokens: CASE_FACTS_ANALYSIS_MAX_TOKENS,
    });

    traceExtra = {
      ...traceExtra,
      model: result.model,
      inputTokens: result.inputTokens ?? undefined,
      outputTokens: result.outputTokens ?? undefined,
      latencyMs: result.latencyMs,
      rawModelResponse: result.text,
    };
    debug?.push(
      "bedrock_ok",
      `${result.inputTokens ?? "?"} in / ${result.outputTokens ?? "?"} out / ${result.latencyMs ?? "?"} ms`
    );
    await flushDebug();

    const { text: content, unknownPlaceholders } = repersonalize(
      result.text,
      mapping
    );
    debug?.push(
      "repersonalize",
      unknownPlaceholders.length > 0
        ? `${unknownPlaceholders.length} unknown placeholders`
        : undefined
    );
    traceExtra = { ...traceExtra, unknownPlaceholders };
    await flushDebug();

    await writeAiAudit({
      tenantId,
      userId: job.userId,
      clientId: ctx.clientId,
      matterId: ctx.matterId,
      task: CASE_FACTS_ANALYSIS_TASK,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
      placeholderCount,
      previewConfirmed: job.previewConfirmed,
      success: true,
    });
    debug?.push("audit_ok");
    await flushDebug();

    const draft = await createAiDraft({
      tenantId,
      clientId: ctx.clientId,
      matterId: ctx.matterId,
      task: CASE_FACTS_ANALYSIS_TASK,
      content,
      userId: job.userId,
    });
    debug?.push("draft_created");
    await flushDebug();

    await markAiJobSucceeded({
      tenantId,
      jobId,
      draftId: draft.id,
      unknownPlaceholders,
      debugTrace: debug?.build(traceExtra) ?? undefined,
    });
  } catch (err) {
    const errCode =
      err instanceof AiGatewayError ? err.code : AI_ERROR.AI_ERROR;
    console.error("[ai/job]", errCode);
    debug?.push("failed", errCode);
    traceExtra = { ...traceExtra, errorCode: errCode, model: modelForAudit };

    try {
      await writeAiAudit({
        tenantId,
        userId: job.userId,
        clientId: job.clientId,
        matterId: job.matterId,
        task: CASE_FACTS_ANALYSIS_TASK,
        model: modelForAudit,
        previewConfirmed: job.previewConfirmed,
        success: false,
        errorCode: errCode,
      });
    } catch {
      console.error("[ai/job]", "AUDIT_FAILED");
    }

    await markAiJobFailed({
      tenantId,
      jobId,
      errorCode: errCode,
      debugTrace: debug?.build(traceExtra) ?? undefined,
    });
  }
}
