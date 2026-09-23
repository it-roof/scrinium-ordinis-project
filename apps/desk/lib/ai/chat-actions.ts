"use server";

import { writeAiAudit } from "@/lib/ai/audit";
import {
  askClaudeChat,
  getBedrockModelId,
  type AskClaudeChatMessage,
} from "@/lib/ai/bedrock";
import {
  AI_ERROR,
  AiGatewayError,
  userMessageForAiError,
  type AiErrorCode,
} from "@/lib/ai/errors";
import {
  AI_CHAT_HISTORY_MAX_TURNS,
  AI_CHAT_MAX_TOKENS,
  AI_CHAT_MESSAGE_MAX_CHARS,
} from "@/lib/ai/limits";
import {
  AI_CHAT_TASK,
  buildAiChatSystemPrompt,
} from "@/lib/ai/prompts/ai-chat";
import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";

export type AiChatMessage = AskClaudeChatMessage;

export type SendAiChatResult =
  | { success: true; reply: string }
  | { success: false; error: string; code: AiErrorCode };

function sanitizeMessages(
  history: AiChatMessage[] | undefined,
  userMessage: string
): AiChatMessage[] | null {
  const trimmedUser = userMessage?.trim() ?? "";
  if (!trimmedUser || trimmedUser.length > AI_CHAT_MESSAGE_MAX_CHARS) {
    return null;
  }

  const cleaned: AiChatMessage[] = [];
  for (const raw of history ?? []) {
    if (cleaned.length >= AI_CHAT_HISTORY_MAX_TURNS) break;
    if (raw.role !== "user" && raw.role !== "assistant") continue;
    const content = raw.content?.trim() ?? "";
    if (!content) continue;
    cleaned.push({
      role: raw.role,
      content: content.slice(0, AI_CHAT_MESSAGE_MAX_CHARS),
    });
  }

  // Drop trailing user (client may have already appended) then append fresh
  while (cleaned.length > 0 && cleaned[cleaned.length - 1]?.role === "user") {
    cleaned.pop();
  }

  cleaned.push({ role: "user", content: trimmedUser });

  // Bedrock requires alternating roles starting with user
  const normalized: AiChatMessage[] = [];
  for (const msg of cleaned) {
    const last = normalized[normalized.length - 1];
    if (last && last.role === msg.role) {
      last.content = `${last.content}\n\n${msg.content}`.slice(
        0,
        AI_CHAT_MESSAGE_MAX_CHARS
      );
      continue;
    }
    normalized.push({ ...msg });
  }
  if (normalized[0]?.role !== "user") {
    return null;
  }
  return normalized.slice(-AI_CHAT_HISTORY_MAX_TURNS);
}

async function requireAiChatUser() {
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
    "ai-chat"
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
 * One chat turn. Klartext to Bedrock EU — UI must warn against client/case PII.
 * Content-free audit only.
 */
export async function sendAiChatMessage(input: {
  message: string;
  history?: AiChatMessage[];
}): Promise<SendAiChatResult> {
  const { user, error, code } = await requireAiChatUser();
  if (!user) {
    return {
      success: false,
      error: error ?? userMessageForAiError(AI_ERROR.FORBIDDEN),
      code: code ?? AI_ERROR.FORBIDDEN,
    };
  }

  const messages = sanitizeMessages(input.history, input.message);
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
      system: buildAiChatSystemPrompt(),
      messages,
      maxTokens: AI_CHAT_MAX_TOKENS,
    });

    await writeAiAudit({
      tenantId: user.tenantId,
      userId: user.id,
      clientId: null,
      matterId: null,
      task: AI_CHAT_TASK,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
      success: true,
    });

    return { success: true, reply: result.text };
  } catch (err) {
    const errCode =
      err instanceof AiGatewayError ? err.code : AI_ERROR.AI_ERROR;
    console.error("[ai/chat]", errCode);
    try {
      await writeAiAudit({
        tenantId: user.tenantId,
        userId: user.id,
        clientId: null,
        matterId: null,
        task: AI_CHAT_TASK,
        model: modelForAudit,
        success: false,
        errorCode: errCode,
      });
    } catch {
      console.error("[ai/chat]", "AUDIT_FAILED");
    }
    return {
      success: false,
      error: userMessageForAiError(errCode),
      code: errCode,
    };
  }
}
