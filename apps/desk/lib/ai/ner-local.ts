/**
 * Local German NER / residual heuristics — runs only in Desk (own software).
 * No cloud NER before Bedrock. Pure functions for Vitest.
 *
 * Auto-NER (Stufe 2 replace): multi-word names + company legal forms.
 * Residuals (gate): also single capitalized tokens — forces mark/dismiss
 * before Bedrock (maximal protection).
 */

import type { KnownEntity } from "@/lib/ai/pseudonymize";

const PLACEHOLDER_TOKEN = /\[[A-Z]+_\d+\]/g;

/** Lowercase tokens that should not start/form a name span. */
const STOP = new Set(
  [
    "ich",
    "mir",
    "mich",
    "mein",
    "meine",
    "meinem",
    "meinen",
    "wir",
    "uns",
    "unser",
    "der",
    "die",
    "das",
    "dem",
    "den",
    "des",
    "ein",
    "eine",
    "einer",
    "eines",
    "einem",
    "einen",
    "und",
    "oder",
    "aber",
    "dass",
    "daß",
    "weil",
    "wenn",
    "für",
    "mit",
    "von",
    "vom",
    "zu",
    "zum",
    "zur",
    "bei",
    "nach",
    "vor",
    "über",
    "unter",
    "aus",
    "auf",
    "im",
    "am",
    "um",
    "an",
    "in",
    "als",
    "auch",
    "noch",
    "nur",
    "schon",
    "hier",
    "dort",
    "heute",
    "euro",
    "eur",
    "betrag",
    "klage",
    "urteil",
    "vertrag",
    "absatz",
    "artikel",
    "paragraph",
    "sachverhalt",
    "mandant",
    "gegner",
    "anspruch",
    "schuldner",
    "gläubiger",
    "glaeubiger",
    "kläger",
    "klaeger",
    "beklagte",
    "beklagter",
    "beklagten",
    "rechtsanwalt",
    "gericht",
    "landgericht",
    "amtsgericht",
    "oberlandesgericht",
    "bgh",
    "gmbh",
    "januar",
    "februar",
    "märz",
    "maerz",
    "april",
    "mai",
    "juni",
    "juli",
    "august",
    "september",
    "oktober",
    "november",
    "dezember",
    "montag",
    "dienstag",
    "mittwoch",
    "donnerstag",
    "freitag",
    "samstag",
    "sonntag",
  ].map((s) => s.toLowerCase())
);

const FIRM_SUFFIX =
  /^(?:GmbH|UG|AG|KG|OHG|GbR|e\.?V\.?|SE|Inc\.?|Ltd\.?|Co\.?|KG\s*aA)$/i;

const FIRM_HINT =
  /(?:bau|bank|werk|technik|handel|service|consult|immobil|versicherung|stiftung|klinik|apotheke)/i;

function stripPlaceholders(text: string): string {
  return text.replace(PLACEHOLDER_TOKEN, " ");
}

function isCapitalizedWord(token: string): boolean {
  if (!token || token.length < 2) return false;
  // Strip trailing punctuation for checks
  const core = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (core.length < 2) return false;
  if (/^\[[A-Z]+_\d+\]$/.test(core)) return false;
  return /\p{Lu}/u.test(core[0] ?? "");
}

function tokenCore(token: string): string {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function pushEntity(
  found: KnownEntity[],
  seen: Set<string>,
  type: KnownEntity["type"],
  value: string
) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2) return;
  const key = trimmed.toLowerCase();
  if (seen.has(key)) return;
  if (STOP.has(key)) return;
  seen.add(key);
  found.push({ type, value: trimmed });
}

/**
 * Auto-replace candidates (Stufe 2): multi-word names + companies with legal form.
 */
export function detectLocalEntities(text: string): KnownEntity[] {
  const cleaned = stripPlaceholders(text);
  const found: KnownEntity[] = [];
  const seen = new Set<string>();

  const companyRe =
    /\b([\p{L}][\p{L}\p{N}&.,\-]*(?:\s+[\p{L}][\p{L}\p{N}&.,\-]*){0,5})\s+(GmbH|UG|AG|KG|OHG|GbR|e\.?\s*V\.?|SE|Inc\.?|Ltd\.?)\b/giu;
  let m: RegExpExecArray | null;
  while ((m = companyRe.exec(cleaned)) !== null) {
    pushEntity(found, seen, "FIRMA", m[0]);
  }

  const tokens = cleaned.split(/(\s+)/);
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (/^\s+$/.test(tok) || !tok) {
      i += 1;
      continue;
    }
    const core = tokenCore(tok);
    if (!isCapitalizedWord(tok) || STOP.has(core.toLowerCase())) {
      i += 1;
      continue;
    }
    const parts: string[] = [core];
    let j = i + 1;
    while (j < tokens.length) {
      if (/^\s+$/.test(tokens[j] ?? "")) {
        j += 1;
        continue;
      }
      const nextRaw = tokens[j] ?? "";
      const next = tokenCore(nextRaw);
      if (!isCapitalizedWord(nextRaw) || STOP.has(next.toLowerCase())) break;
      if (FIRM_SUFFIX.test(next)) {
        parts.push(next);
        j += 1;
        break;
      }
      parts.push(next);
      j += 1;
      if (parts.length >= 4) break;
    }
    if (parts.length >= 2) {
      const span = parts.join(" ");
      const last = parts[parts.length - 1] ?? "";
      if (FIRM_SUFFIX.test(last) || FIRM_HINT.test(span)) {
        pushEntity(found, seen, "FIRMA", span);
      } else {
        pushEntity(found, seen, "PERSON", span);
      }
    }
    i = j > i ? j : i + 1;
  }

  return found.sort((a, b) => b.value.length - a.value.length);
}

/**
 * Aggressive residual scan for the block gate: multi-word NER hits plus
 * single capitalized tokens (e.g. "Mustermann") that were not replaced.
 */
export function findResidualSpans(pseudonymizedText: string): string[] {
  const cleaned = stripPlaceholders(pseudonymizedText);
  const found: string[] = [];
  const seen = new Set<string>();

  function push(value: string) {
    const trimmed = value.trim().replace(/\s+/g, " ");
    if (trimmed.length < 3) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key) || STOP.has(key)) return;
    seen.add(key);
    found.push(trimmed);
  }

  for (const e of detectLocalEntities(cleaned)) {
    push(e.value);
  }

  const tokens = cleaned.split(/\s+/);
  for (const raw of tokens) {
    const core = tokenCore(raw);
    if (core.length < 3) continue;
    if (!isCapitalizedWord(core)) continue;
    if (STOP.has(core.toLowerCase())) continue;
    if (FIRM_SUFFIX.test(core)) continue;
    if (/^\d/.test(core)) continue;
    // Skip ALL-CAPS short acronyms (AZ, GmbH already handled)
    if (core.length <= 3 && core === core.toUpperCase()) continue;
    push(core);
  }

  return found.sort((a, b) => b.length - a.length);
}

/**
 * Only honor dismissals that exactly match a server-detected residual
 * (case-insensitive). Prevents inventing dismissals that do nothing weird.
 */
export function filterDismissedResiduals(
  residuals: string[],
  dismissed: string[]
): string[] {
  const dismissedKeys = new Set(
    dismissed.map((d) => d.trim().toLowerCase()).filter(Boolean)
  );
  return residuals.filter((r) => !dismissedKeys.has(r.trim().toLowerCase()));
}

/** Drop NER candidates already covered by known DB entities (substring / equal). */
export function filterNovelNerEntities(
  ner: KnownEntity[],
  known: KnownEntity[]
): KnownEntity[] {
  const knownValues = known
    .map((k) => k.value.trim().toLowerCase())
    .filter(Boolean);
  return ner.filter((e) => {
    const v = e.value.trim().toLowerCase();
    if (!v) return false;
    return !knownValues.some((k) => k === v || k.includes(v) || v.includes(k));
  });
}

/** Keep only marks that actually appear in the (pre-mark) text. */
export function sanitizeManualMarks(
  text: string,
  marks: string[],
  maxItems: number,
  maxItemChars: number
): string[] {
  const lower = text.toLowerCase();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of marks) {
    if (out.length >= maxItems) break;
    const v = raw.trim().slice(0, maxItemChars);
    if (v.length < 2) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    if (!lower.includes(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}
