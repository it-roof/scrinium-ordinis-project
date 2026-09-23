"use server";

import { writeAiAudit } from "@/lib/ai/audit";
import {
  askClaude,
  askClaudeWithDocument,
  getBedrockModelId,
} from "@/lib/ai/bedrock";
import {
  AI_CONTRACT_RAW_MAX_BYTES,
  detectContractUploadKind,
  validateContractUploadMeta,
} from "@/lib/ai/contract-extract";
import {
  AI_ERROR,
  AiGatewayError,
  userMessageForAiError,
  type AiErrorCode,
} from "@/lib/ai/errors";
import type { PseudonymGatePolicy } from "@/lib/ai/gate-policy";
import { AI_CONTRACT_MAX_CHARS } from "@/lib/ai/limits";
import {
  assertResidualsCleared,
  runPseudonymPipeline,
} from "@/lib/ai/pipeline";
import {
  buildContractAnalysisDocumentUserMessage,
  buildContractAnalysisSystemPrompt,
  buildContractAnalysisUserMessage,
  CONTRACT_ANALYSIS_MAX_TOKENS,
  CONTRACT_ANALYSIS_TASK,
} from "@/lib/ai/prompts/contract-analysis";
import { repersonalize } from "@/lib/ai/pseudonymize";
import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";

export type PreviewContractAnalysisResult =
  | {
      success: true;
      pseudonymizedText: string;
      placeholderCount: number;
      residuals: string[];
      gatePolicy: PseudonymGatePolicy;
    }
  | { success: false; error: string; code: AiErrorCode };

export type AnalyzeContractResult =
  | {
      success: true;
      analysis: string;
      placeholderCount: number;
      unknownPlaceholders: string[];
    }
  | { success: false; error: string; code: AiErrorCode };

async function requireContractAnalysisUser() {
  const user = await requireSessionUser();
  if (!user) {
    return {
      error: userMessageForAiError(AI_ERROR.FORBIDDEN),
      code: AI_ERROR.FORBIDDEN as AiErrorCode,
      user: null,
    };
  }
  const denied = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "contract-analysis"
  );
  if (denied) {
    return {
      error: userMessageForAiError(AI_ERROR.FORBIDDEN),
      code: AI_ERROR.FORBIDDEN as AiErrorCode,
      user: null,
    };
  }
  return { error: null, code: null, user };
}

/**
 * Preview: Stufe 1+2 + residuals (no matter DB entities — paste-only).
 */
export async function previewContractAnalysis(input: {
  contractText: string;
  manualMarks?: string[];
  dismissedResiduals?: string[];
}): Promise<PreviewContractAnalysisResult> {
  const { user, error, code } = await requireContractAnalysisUser();
  if (!user) {
    return {
      success: false,
      error: error ?? userMessageForAiError(AI_ERROR.FORBIDDEN),
      code: code ?? AI_ERROR.FORBIDDEN,
    };
  }

  const text = input.contractText?.trim() ?? "";
  if (!text) {
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.VALIDATION),
      code: AI_ERROR.VALIDATION,
    };
  }
  if (text.length > AI_CONTRACT_MAX_CHARS) {
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.VALIDATION),
      code: AI_ERROR.VALIDATION,
    };
  }

  try {
    const pipeline = runPseudonymPipeline(text, [], {
      manualMarks: input.manualMarks,
      dismissedResiduals: input.dismissedResiduals,
    });
    return {
      success: true,
      pseudonymizedText: pipeline.text,
      placeholderCount: pipeline.placeholderCount,
      residuals: pipeline.residuals,
      gatePolicy: pipeline.gatePolicy,
    };
  } catch (err) {
    if (err instanceof AiGatewayError) {
      return {
        success: false,
        error: userMessageForAiError(err.code),
        code: err.code,
      };
    }
    console.error("[ai/contract]", "PREVIEW_FAILED");
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.AI_ERROR),
      code: AI_ERROR.AI_ERROR,
    };
  }
}

/**
 * Sync contract analysis. Klartext never leaves after local pseudonymization.
 * Mapping stays in memory; result is re-personalized before return.
 */
export async function analyzeContract(input: {
  contractText: string;
  manualMarks?: string[];
  dismissedResiduals?: string[];
  previewConfirmed?: boolean;
}): Promise<AnalyzeContractResult> {
  const { user, error, code } = await requireContractAnalysisUser();
  if (!user) {
    return {
      success: false,
      error: error ?? userMessageForAiError(AI_ERROR.FORBIDDEN),
      code: code ?? AI_ERROR.FORBIDDEN,
    };
  }

  const text = input.contractText?.trim() ?? "";
  if (!text || !input.previewConfirmed) {
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.VALIDATION),
      code: AI_ERROR.VALIDATION,
    };
  }
  if (text.length > AI_CONTRACT_MAX_CHARS) {
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.VALIDATION),
      code: AI_ERROR.VALIDATION,
    };
  }

  let modelForAudit = "unset";
  try {
    modelForAudit = getBedrockModelId();
  } catch {
    modelForAudit = "unset";
  }

  try {
    const pipeline = runPseudonymPipeline(text, [], {
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

    const result = await askClaude({
      system: buildContractAnalysisSystemPrompt(),
      user: buildContractAnalysisUserMessage(pipeline.text),
      maxTokens: CONTRACT_ANALYSIS_MAX_TOKENS,
    });

    const { text: analysis, unknownPlaceholders } = repersonalize(
      result.text,
      pipeline.mapping
    );

    await writeAiAudit({
      tenantId: user.tenantId,
      userId: user.id,
      clientId: null,
      matterId: null,
      task: CONTRACT_ANALYSIS_TASK,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
      placeholderCount: pipeline.placeholderCount,
      previewConfirmed: true,
      success: true,
    });

    return {
      success: true,
      analysis,
      placeholderCount: pipeline.placeholderCount,
      unknownPlaceholders,
    };
  } catch (err) {
    const errCode =
      err instanceof AiGatewayError ? err.code : AI_ERROR.AI_ERROR;
    console.error("[ai/contract]", errCode);
    try {
      await writeAiAudit({
        tenantId: user.tenantId,
        userId: user.id,
        clientId: null,
        matterId: null,
        task: CONTRACT_ANALYSIS_TASK,
        model: modelForAudit,
        previewConfirmed: Boolean(input.previewConfirmed),
        success: false,
        errorCode: errCode,
      });
    } catch {
      console.error("[ai/contract]", "AUDIT_FAILED");
    }
    return {
      success: false,
      error: userMessageForAiError(errCode),
      code: errCode,
    };
  }
}

export type ExtractContractDocumentResult =
  | {
      success: true;
      text: string;
      kind: "docx" | "pdf";
      truncated: boolean;
      filename: string;
    }
  | { success: false; error: string; code: AiErrorCode };

/**
 * Extract text from uploaded DOCX/PDF (FormData field "file").
 * File is not stored — only returned as text for the paste/pseudonym flow.
 */
export async function extractContractDocument(
  formData: FormData
): Promise<ExtractContractDocumentResult> {
  const { user, error, code } = await requireContractAnalysisUser();
  if (!user) {
    return {
      success: false,
      error: error ?? userMessageForAiError(AI_ERROR.FORBIDDEN),
      code: code ?? AI_ERROR.FORBIDDEN,
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return {
      success: false,
      error: "Bitte eine Datei auswählen.",
      code: AI_ERROR.VALIDATION,
    };
  }

  try {
    const { extractContractTextFromBuffer } = await import(
      "@/lib/ai/contract-extract-server"
    );
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractContractTextFromBuffer({
      buffer,
      filename: file.name,
      mimeType: file.type || "",
    });
    if (!result.ok) {
      return {
        success: false,
        error: result.error,
        code: AI_ERROR.VALIDATION,
      };
    }
    return {
      success: true,
      text: result.text,
      kind: result.kind,
      truncated: result.truncated,
      filename: result.filename,
    };
  } catch {
    console.error("[ai/contract]", "EXTRACT_FAILED");
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.AI_ERROR),
      code: AI_ERROR.AI_ERROR,
    };
  }
}

/**
 * Analyze uploaded PDF/DOCX by sending the file bytes to Claude (Bedrock document).
 * TEMPORARY: Klartext/Scan goes to Bedrock without local pseudonymization.
 * Reinstate absolute rule later — see docs/ai-pseudonymization.md.
 * File is not stored.
 */
export async function analyzeContractDocumentRaw(
  formData: FormData
): Promise<AnalyzeContractResult> {
  const { user, error, code } = await requireContractAnalysisUser();
  if (!user) {
    return {
      success: false,
      error: error ?? userMessageForAiError(AI_ERROR.FORBIDDEN),
      code: code ?? AI_ERROR.FORBIDDEN,
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return {
      success: false,
      error: "Bitte eine Datei auswählen.",
      code: AI_ERROR.VALIDATION,
    };
  }

  if (file.size > AI_CONTRACT_RAW_MAX_BYTES) {
    return {
      success: false,
      error: `Datei zu groß für Direktanalyse (max. ${(AI_CONTRACT_RAW_MAX_BYTES / (1024 * 1024)).toFixed(1)} MB).`,
      code: AI_ERROR.VALIDATION,
    };
  }

  const metaError = validateContractUploadMeta(
    file.name,
    file.size,
    file.type || ""
  );
  if (metaError) {
    return {
      success: false,
      error: metaError,
      code: AI_ERROR.VALIDATION,
    };
  }

  const kind = detectContractUploadKind(file.name, file.type || "");
  if (!kind) {
    return {
      success: false,
      error: "Nur Word (.docx) oder PDF (.pdf) möglich.",
      code: AI_ERROR.VALIDATION,
    };
  }

  let modelForAudit = "unset";
  try {
    modelForAudit = getBedrockModelId();
  } catch {
    modelForAudit = "unset";
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await askClaudeWithDocument({
      system: buildContractAnalysisSystemPrompt(),
      userText: buildContractAnalysisDocumentUserMessage(),
      document: {
        format: kind,
        name: "Vertrag",
        bytes,
      },
      maxTokens: CONTRACT_ANALYSIS_MAX_TOKENS,
    });

    await writeAiAudit({
      tenantId: user.tenantId,
      userId: user.id,
      clientId: null,
      matterId: null,
      task: CONTRACT_ANALYSIS_TASK,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
      placeholderCount: 0,
      previewConfirmed: true,
      success: true,
    });

    return {
      success: true,
      analysis: result.text,
      placeholderCount: 0,
      unknownPlaceholders: [],
    };
  } catch (err) {
    const errCode =
      err instanceof AiGatewayError ? err.code : AI_ERROR.AI_ERROR;
    console.error("[ai/contract]", errCode);
    try {
      await writeAiAudit({
        tenantId: user.tenantId,
        userId: user.id,
        clientId: null,
        matterId: null,
        task: CONTRACT_ANALYSIS_TASK,
        model: modelForAudit,
        previewConfirmed: true,
        success: false,
        errorCode: errCode,
      });
    } catch {
      console.error("[ai/contract]", "AUDIT_FAILED");
    }
    return {
      success: false,
      error: userMessageForAiError(errCode),
      code: errCode,
    };
  }
}
