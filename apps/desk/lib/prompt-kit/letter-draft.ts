import type { LetterKind } from "@/lib/letters/types";

export const PROMPT_KIT_LETTER_DRAFT_KEY = "scrinium.prompt-kit.letter-draft";

export type PromptKitLetterDraft = {
  kind: LetterKind;
  title: string;
  body: string;
  /** Nach Übernahme: selbst bearbeiten oder Delegations-Fork zeigen. */
  workflow?: "edit" | "delegate";
};

export function savePromptKitLetterDraft(draft: PromptKitLetterDraft) {
  sessionStorage.setItem(PROMPT_KIT_LETTER_DRAFT_KEY, JSON.stringify(draft));
}

export function consumePromptKitLetterDraft(): PromptKitLetterDraft | null {
  try {
    const raw = sessionStorage.getItem(PROMPT_KIT_LETTER_DRAFT_KEY);
    if (!raw) {
      return null;
    }
    sessionStorage.removeItem(PROMPT_KIT_LETTER_DRAFT_KEY);
    const parsed = JSON.parse(raw) as PromptKitLetterDraft;
    if (
      typeof parsed?.body !== "string" ||
      typeof parsed?.title !== "string" ||
      typeof parsed?.kind !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Erstes „Thema: …“ aus Freitext für den Schreibentitel. */
export function extractThemaTitle(input: string): string | undefined {
  const match = input.match(/^\s*Thema:\s*(.+)$/im);
  const value = match?.[1]?.trim();
  return value || undefined;
}
