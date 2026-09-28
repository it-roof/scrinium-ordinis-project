import type { MatterAiChatMessageRecord } from "@/lib/ai/matter-chat/storage";

export function isAnalysisResultMessage(
  msg: MatterAiChatMessageRecord
): boolean {
  if (msg.role !== "assistant" || msg.actionId !== "analyze-case-facts") {
    return false;
  }
  if (msg.content.length < 400) return false;
  if (msg.content.startsWith("Analyse läuft")) return false;
  if (msg.content.startsWith("Pseudonymisierte Vorschau")) return false;
  return true;
}

export function isCounterReviewResultMessage(
  msg: MatterAiChatMessageRecord
): boolean {
  if (msg.role !== "assistant" || msg.actionId !== "counter-review") {
    return false;
  }
  if (msg.content.length < 400) return false;
  if (msg.content.startsWith("Gegenprüfung läuft")) return false;
  if (msg.content.startsWith("Pseudonymisierte Vorschau")) return false;
  return true;
}

export function isCreateLetterResultMessage(
  msg: MatterAiChatMessageRecord
): boolean {
  if (msg.role !== "assistant" || msg.actionId !== "create-letter") {
    return false;
  }
  if (msg.content.length < 80) return false;
  if (msg.content.startsWith("Schreiben wird erstellt")) return false;
  if (msg.content.startsWith("Pseudonymisierte Vorschau")) return false;
  return true;
}

export function isEmailDraftResultMessage(
  msg: MatterAiChatMessageRecord
): boolean {
  if (msg.role !== "assistant" || msg.actionId !== "create-email-text") {
    return false;
  }
  if (msg.content.length < 40) return false;
  if (msg.content.startsWith("E-Mail-Text wird erstellt")) return false;
  if (msg.content.startsWith("Pseudonymisierte Vorschau")) return false;
  return true;
}

export function pickLastAnalysisResult(
  messages: MatterAiChatMessageRecord[]
): MatterAiChatMessageRecord | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg && isAnalysisResultMessage(msg)) return msg;
  }
  return null;
}

/** Prefer Gegenprüfung, else Analyse — Grundlage für Schreiben. */
export function pickLastLetterSource(
  messages: MatterAiChatMessageRecord[]
): MatterAiChatMessageRecord | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg && isCounterReviewResultMessage(msg)) return msg;
  }
  return pickLastAnalysisResult(messages);
}

/** Prefer Schreiben-Ergebnis, else Gegenprüfung/Analyse. */
export function pickLastEmailSource(
  messages: MatterAiChatMessageRecord[]
): MatterAiChatMessageRecord | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg && isCreateLetterResultMessage(msg)) return msg;
  }
  return pickLastLetterSource(messages);
}

export function pickLastEmailDraft(
  messages: MatterAiChatMessageRecord[]
): MatterAiChatMessageRecord | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg && isEmailDraftResultMessage(msg)) return msg;
  }
  return null;
}
