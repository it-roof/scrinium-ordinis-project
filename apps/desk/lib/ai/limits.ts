/**
 * Hard limits for AI case-facts input — DoS / abuse bounds.
 */

export const AI_FACTS_MAX_CHARS = 50_000;
export const AI_MANUAL_MARKS_MAX = 50;
export const AI_MANUAL_MARK_MAX_CHARS = 200;
export const AI_DISMISSED_RESIDUALS_MAX = 50;

/**
 * Max age of pending/running jobs that may still hold plaintext input_facts /
 * marks. After this, secrets are wiped and the job fails (no silent Klartext at rest).
 */
export const AI_JOB_SECRETS_TTL_MS = 15 * 60 * 1000;

export function clampStringList(
  values: string[] | undefined,
  maxItems: number,
  maxItemChars: number
): string[] {
  if (!values?.length) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    if (out.length >= maxItems) break;
    const v = raw.trim().slice(0, maxItemChars);
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}
