/**
 * Contract workspace session helpers — unit-testable, no I/O.
 */

export type { ContractWorkspaceMessage } from "./types";
export type { ContractWorkspaceFilePayload } from "./types";

import type { ContractWorkspaceMessage } from "./types";

export const AI_CONTRACT_WORKSPACE_MESSAGE_MAX_CHARS = 8_000;
export const AI_CONTRACT_WORKSPACE_HISTORY_MAX_TURNS = 24;
/** Start message may carry pasted Vertrag/Sachverhalt. */
export const AI_CONTRACT_WORKSPACE_START_MAX_CHARS = 50_000;
export const AI_CONTRACT_DOCX_BODY_MAX_CHARS = 200_000;
export const AI_CONTRACT_DOCX_TITLE_MAX_CHARS = 120;

/**
 * Normalize history + new user message for Bedrock Converse
 * (alternating roles, start with user, clamp sizes).
 */
export function normalizeContractWorkspaceMessages(
  history: ContractWorkspaceMessage[] | undefined,
  userMessage: string,
  options?: {
    maxMessageChars?: number;
    maxTurns?: number;
  }
): ContractWorkspaceMessage[] | null {
  const maxChars =
    options?.maxMessageChars ?? AI_CONTRACT_WORKSPACE_MESSAGE_MAX_CHARS;
  const maxTurns =
    options?.maxTurns ?? AI_CONTRACT_WORKSPACE_HISTORY_MAX_TURNS;

  const trimmedUser = userMessage?.trim() ?? "";
  if (!trimmedUser || trimmedUser.length > maxChars) {
    return null;
  }

  const cleaned: ContractWorkspaceMessage[] = [];
  for (const raw of history ?? []) {
    if (cleaned.length >= maxTurns) break;
    if (raw.role !== "user" && raw.role !== "assistant") continue;
    const content = raw.content?.trim() ?? "";
    if (!content) continue;
    cleaned.push({
      role: raw.role,
      content: content.slice(0, maxChars),
    });
  }

  while (cleaned.length > 0 && cleaned[cleaned.length - 1]?.role === "user") {
    cleaned.pop();
  }

  cleaned.push({ role: "user", content: trimmedUser.slice(0, maxChars) });

  const normalized: ContractWorkspaceMessage[] = [];
  for (const msg of cleaned) {
    const last = normalized[normalized.length - 1];
    if (last && last.role === msg.role) {
      last.content = `${last.content}\n\n${msg.content}`.slice(0, maxChars);
      continue;
    }
    normalized.push({ ...msg });
  }
  while (normalized.length > 0 && normalized[0]?.role !== "user") {
    normalized.shift();
  }
  if (normalized[0]?.role !== "user") {
    return null;
  }
  return normalized.slice(-maxTurns);
}
