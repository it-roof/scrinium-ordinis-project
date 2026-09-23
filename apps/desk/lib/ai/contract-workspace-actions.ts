"use server";

import { writeAiAudit } from "@/lib/ai/audit";
import { askClaudeChat, getBedrockModelId } from "@/lib/ai/bedrock";
import {
  AI_CONTRACT_RAW_MAX_BYTES,
  detectContractUploadKind,
  validateContractUploadMeta,
} from "@/lib/ai/contract-extract";
import {
  AI_CONTRACT_DOCX_BODY_MAX_CHARS,
  AI_CONTRACT_DOCX_TITLE_MAX_CHARS,
  AI_CONTRACT_WORKSPACE_MESSAGE_MAX_CHARS,
  AI_CONTRACT_WORKSPACE_START_MAX_CHARS,
  normalizeContractWorkspaceMessages,
} from "@/lib/ai/contract-kit/session";
import type {
  ContractWorkspaceFilePayload,
  ContractWorkspaceMessage,
  ContractWorkspaceTurnResult,
  ExportContractDocxResult,
} from "@/lib/ai/contract-kit/types";
import { writeContractDocx } from "@/lib/ai/contract-kit/write-docx";
import {
  AI_ERROR,
  AiGatewayError,
  userMessageForAiError,
  type AiErrorCode,
} from "@/lib/ai/errors";
import {
  buildContractAnalysisSystemPrompt,
  buildContractWorkspaceStartMessage,
  CONTRACT_ANALYSIS_MAX_TOKENS,
  CONTRACT_ANALYSIS_TASK,
  CONTRACT_DRAFT_USER_MESSAGE,
} from "@/lib/ai/prompts/contract-analysis";
import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";

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

async function auditContractTurn(input: {
  user: { tenantId: string; id: string };
  model: string;
  success: boolean;
  errorCode?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs?: number | null;
}) {
  try {
    await writeAiAudit({
      tenantId: input.user.tenantId,
      userId: input.user.id,
      clientId: null,
      matterId: null,
      task: CONTRACT_ANALYSIS_TASK,
      model: input.model,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      latencyMs: input.latencyMs ?? null,
      placeholderCount: 0,
      previewConfirmed: true,
      success: input.success,
      errorCode: input.errorCode ?? null,
    });
  } catch {
    console.error("[ai/contract-workspace]", "AUDIT_FAILED");
  }
}

function decodeBase64ToBytes(base64: string): Uint8Array | null {
  try {
    const cleaned = base64.replace(/^data:[^;]+;base64,/, "").trim();
    if (!cleaned) return null;
    return new Uint8Array(Buffer.from(cleaned, "base64"));
  } catch {
    return null;
  }
}

function parseUploadedDocument(
  file: ContractWorkspaceFilePayload | undefined
):
  | { ok: true; format: "pdf" | "docx"; bytes: Uint8Array; filename: string }
  | { ok: false; error: string; code: AiErrorCode } {
  if (!file) {
    return {
      ok: false,
      error: "Datei fehlt.",
      code: AI_ERROR.VALIDATION,
    };
  }
  const bytes = decodeBase64ToBytes(file.base64);
  if (!bytes || bytes.byteLength === 0) {
    return {
      ok: false,
      error: "Datei konnte nicht gelesen werden.",
      code: AI_ERROR.VALIDATION,
    };
  }
  if (bytes.byteLength > AI_CONTRACT_RAW_MAX_BYTES) {
    return {
      ok: false,
      error: `Datei zu groß (max. ${(AI_CONTRACT_RAW_MAX_BYTES / (1024 * 1024)).toFixed(1)} MB).`,
      code: AI_ERROR.VALIDATION,
    };
  }
  const metaError = validateContractUploadMeta(
    file.name,
    bytes.byteLength,
    file.mimeType || ""
  );
  if (metaError) {
    return { ok: false, error: metaError, code: AI_ERROR.VALIDATION };
  }
  const kind = detectContractUploadKind(file.name, file.mimeType || "");
  if (!kind) {
    return {
      ok: false,
      error: "Nur Word (.docx) oder PDF (.pdf) möglich.",
      code: AI_ERROR.VALIDATION,
    };
  }
  return {
    ok: true,
    format: kind,
    bytes,
    filename: file.name.trim() || `vertrag.${kind}`,
  };
}

/**
 * Start workspace: optional PDF/DOCX + message.
 * TEMPORARY: file bytes go to Bedrock unredacted — see ai-pseudonymization.md.
 */
export async function startContractWorkspace(input: {
  message: string;
  file?: ContractWorkspaceFilePayload;
}): Promise<ContractWorkspaceTurnResult> {
  const { user, error, code } = await requireContractAnalysisUser();
  if (!user) {
    return {
      success: false,
      error: error ?? userMessageForAiError(AI_ERROR.FORBIDDEN),
      code: code ?? AI_ERROR.FORBIDDEN,
    };
  }

  const messageRaw = input.message ?? "";
  const hasFile = Boolean(input.file?.base64);

  if (!hasFile && !messageRaw.trim()) {
    return {
      success: false,
      error: "Bitte Vertrag hochladen oder Sachverhalt eingeben.",
      code: AI_ERROR.VALIDATION,
    };
  }
  if (messageRaw.trim().length > AI_CONTRACT_WORKSPACE_START_MAX_CHARS) {
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.VALIDATION),
      code: AI_ERROR.VALIDATION,
    };
  }

  let document:
    | { format: "pdf" | "docx"; name: string; bytes: Uint8Array }
    | undefined;
  let filenameForDisplay: string | null = null;

  if (hasFile && input.file) {
    const parsed = parseUploadedDocument(input.file);
    if (!parsed.ok) {
      return {
        success: false,
        error: parsed.error,
        code: parsed.code,
      };
    }
    document = {
      format: parsed.format,
      name: "Vertrag",
      bytes: parsed.bytes,
    };
    filenameForDisplay = parsed.filename;
  }

  const userPrompt = buildContractWorkspaceStartMessage({
    hasDocument: Boolean(document),
    userText: messageRaw,
  });
  const userDisplay = filenameForDisplay
    ? messageRaw.trim()
      ? `${filenameForDisplay}\n\n${messageRaw.trim()}`
      : `Vertrag: ${filenameForDisplay}`
    : messageRaw.trim();

  let modelForAudit = "unset";
  try {
    modelForAudit = getBedrockModelId();
  } catch {
    modelForAudit = "unset";
  }

  try {
    const result = await askClaudeChat({
      system: buildContractAnalysisSystemPrompt(),
      messages: [{ role: "user", content: userPrompt }],
      document,
      maxTokens: CONTRACT_ANALYSIS_MAX_TOKENS,
    });

    await auditContractTurn({
      user,
      model: result.model,
      success: true,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    });

    return {
      success: true,
      reply: result.text,
      userDisplay,
    };
  } catch (err) {
    const errCode =
      err instanceof AiGatewayError ? err.code : AI_ERROR.AI_ERROR;
    console.error("[ai/contract-workspace]", errCode);
    await auditContractTurn({
      user,
      model: modelForAudit,
      success: false,
      errorCode: errCode,
    });
    return {
      success: false,
      error: userMessageForAiError(errCode),
      code: errCode,
    };
  }
}

export async function continueContractWorkspace(input: {
  history: ContractWorkspaceMessage[];
  message: string;
}): Promise<ContractWorkspaceTurnResult> {
  const { user, error, code } = await requireContractAnalysisUser();
  if (!user) {
    return {
      success: false,
      error: error ?? userMessageForAiError(AI_ERROR.FORBIDDEN),
      code: code ?? AI_ERROR.FORBIDDEN,
    };
  }

  const messages = normalizeContractWorkspaceMessages(
    input.history,
    input.message,
    { maxMessageChars: AI_CONTRACT_WORKSPACE_MESSAGE_MAX_CHARS }
  );
  if (!messages) {
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
    const result = await askClaudeChat({
      system: buildContractAnalysisSystemPrompt(),
      messages,
      maxTokens: CONTRACT_ANALYSIS_MAX_TOKENS,
    });

    await auditContractTurn({
      user,
      model: result.model,
      success: true,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    });

    return {
      success: true,
      reply: result.text,
      userDisplay: input.message.trim(),
    };
  } catch (err) {
    const errCode =
      err instanceof AiGatewayError ? err.code : AI_ERROR.AI_ERROR;
    console.error("[ai/contract-workspace]", errCode);
    await auditContractTurn({
      user,
      model: modelForAudit,
      success: false,
      errorCode: errCode,
    });
    return {
      success: false,
      error: userMessageForAiError(errCode),
      code: errCode,
    };
  }
}

export async function draftImprovedContract(input: {
  history: ContractWorkspaceMessage[];
}): Promise<ContractWorkspaceTurnResult> {
  const result = await continueContractWorkspace({
    history: input.history,
    message: CONTRACT_DRAFT_USER_MESSAGE,
  });
  if (!result.success) return result;
  return {
    ...result,
    userDisplay: "Verbesserten Vertrag erstellen",
  };
}

export async function exportContractDocx(input: {
  title: string;
  body: string;
}): Promise<ExportContractDocxResult> {
  const { user, error, code } = await requireContractAnalysisUser();
  if (!user) {
    return {
      success: false,
      error: error ?? userMessageForAiError(AI_ERROR.FORBIDDEN),
      code: code ?? AI_ERROR.FORBIDDEN,
    };
  }

  const title = (input.title ?? "")
    .trim()
    .slice(0, AI_CONTRACT_DOCX_TITLE_MAX_CHARS);
  const body = (input.body ?? "").trim();
  if (!body || body.length > AI_CONTRACT_DOCX_BODY_MAX_CHARS) {
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.VALIDATION),
      code: AI_ERROR.VALIDATION,
    };
  }

  try {
    const result = await writeContractDocx({
      title: title || "Vertragsentwurf",
      body,
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
      filename: result.filename,
      base64: result.buffer.toString("base64"),
    };
  } catch {
    console.error("[ai/contract-workspace]", "DOCX_EXPORT_FAILED");
    return {
      success: false,
      error: userMessageForAiError(AI_ERROR.AI_ERROR),
      code: AI_ERROR.AI_ERROR,
    };
  }
}
