/**
 * Pseudonym gate policy — pure helper (no server-only).
 * Default: block (maximal protection).
 */

export type PseudonymGatePolicy = "block" | "warn";

export function getPseudonymGatePolicy(
  env?: { AI_PSEUDONYM_GATE?: string | undefined }
): PseudonymGatePolicy {
  const v = (env ?? process.env).AI_PSEUDONYM_GATE?.trim().toLowerCase();
  if (v === "warn") return "warn";
  return "block";
}
