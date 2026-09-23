/**
 * Pseudonymization (stage 1) — pure functions, safe to unit-test without server-only.
 * Mapping stays in request memory only; never log or persist.
 */

export type EntityType = "PERSON" | "FIRMA" | "AZ" | "ORT" | "IBAN" | "EMAIL" | "PHONE" | "OTHER";

export type KnownEntity = {
  type: Exclude<EntityType, "IBAN" | "EMAIL" | "PHONE" | "OTHER">;
  value: string;
};

export type PseudonymizeResult = {
  text: string;
  mapping: Map<string, string>;
  placeholderCount: number;
};

export type RepersonalizeResult = {
  text: string;
  unknownPlaceholders: string[];
};

const PLACEHOLDER_RE = /\[([A-Z]+)_(\d+)\]/g;

/** Fixed patterns — applied after known entities. */
const PATTERN_DEFS: { type: EntityType; regex: RegExp }[] = [
  {
    type: "IBAN",
    // DE + 2 check digits + up to 30 alphanumerics (spaces optional)
    regex: /\bDE\s?\d{2}(?:\s?\d{4}){4}\s?\d{2}\b/gi,
  },
  {
    type: "EMAIL",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    type: "PHONE",
    // German-ish phone numbers (optional +49, spaces/dashes)
    regex: /(?:\+49|0)\s?(?:\d[\s\-./]?){6,14}\d\b/g,
  },
  {
    type: "AZ",
    // Court file numbers e.g. 12 O 345/25
    regex: /\b\d{1,3}\s+[A-ZÄÖÜ]{1,4}\s+\d{1,5}\/\d{2,4}\b/g,
  },
];

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replace whole-word (Unicode) occurrences of `needle` with `placeholder`.
 * Case-insensitive; first occurrence's casing is kept in the mapping value.
 */
function replaceWholeWord(
  text: string,
  needle: string,
  placeholder: string
): string {
  if (!needle.trim()) return text;
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}_])${escapeRegExp(needle)}(?![\\p{L}\\p{N}_])`,
    "giu"
  );
  return text.replace(pattern, placeholder);
}

export function pseudonymize(
  text: string,
  knownEntities: KnownEntity[]
): PseudonymizeResult {
  const mapping = new Map<string, string>(); // placeholder -> original (first spelling)
  const valueToPlaceholder = new Map<string, string>(); // normalized value -> placeholder
  const counters = new Map<EntityType, number>();

  function nextPlaceholder(type: EntityType, original: string): string {
    const key = normalizeKey(original);
    const existing = valueToPlaceholder.get(key);
    if (existing) return existing;
    const n = (counters.get(type) ?? 0) + 1;
    counters.set(type, n);
    const placeholder = `[${type}_${n}]`;
    valueToPlaceholder.set(key, placeholder);
    mapping.set(placeholder, original);
    return placeholder;
  }

  // Longer values first so "Küchen Huber GmbH" beats "Huber"
  const sorted = [...knownEntities]
    .filter((e) => e.value.trim().length > 0)
    .sort((a, b) => b.value.length - a.value.length);

  let result = text;
  for (const entity of sorted) {
    const needle = entity.value.trim();
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}_])${escapeRegExp(needle)}(?![\\p{L}\\p{N}_])`,
      "iu"
    );
    if (!pattern.test(result)) continue;
    // Reset lastIndex after .test() on global-less regex is fine; recreate for replace.
    const placeholder = nextPlaceholder(entity.type, needle);
    result = replaceWholeWord(result, needle, placeholder);
  }

  for (const { type, regex } of PATTERN_DEFS) {
    result = result.replace(regex, (match) => nextPlaceholder(type, match));
  }

  return {
    text: result,
    mapping,
    placeholderCount: mapping.size,
  };
}

/**
 * Apply additional manual marks (preview phase): each unique span → [OTHER_N].
 * Spans must already be substrings of the (possibly already pseudonymized) text.
 */
export function applyManualMarks(
  text: string,
  marks: string[],
  mapping: Map<string, string>
): PseudonymizeResult {
  const valueToPlaceholder = new Map<string, string>();
  for (const [ph, original] of mapping) {
    valueToPlaceholder.set(normalizeKey(original), ph);
  }
  let otherCount = 0;
  for (const ph of mapping.keys()) {
    const m = /^\[OTHER_(\d+)\]$/.exec(ph);
    if (m) otherCount = Math.max(otherCount, Number(m[1]));
  }

  let result = text;
  const sorted = [...marks]
    .filter((m) => m.trim().length > 0)
    .sort((a, b) => b.length - a.length);

  for (const mark of sorted) {
    const trimmed = mark.trim();
    const key = normalizeKey(trimmed);
    let placeholder = valueToPlaceholder.get(key);
    if (!placeholder) {
      otherCount += 1;
      placeholder = `[OTHER_${otherCount}]`;
      valueToPlaceholder.set(key, placeholder);
      mapping.set(placeholder, trimmed);
    }
    result = replaceWholeWord(result, trimmed, placeholder);
  }

  return { text: result, mapping, placeholderCount: mapping.size };
}

export function repersonalize(
  text: string,
  mapping: Map<string, string>
): RepersonalizeResult {
  const unknownPlaceholders: string[] = [];
  const seenUnknown = new Set<string>();

  const result = text.replace(PLACEHOLDER_RE, (match) => {
    const original = mapping.get(match);
    if (original !== undefined) return original;
    if (!seenUnknown.has(match)) {
      seenUnknown.add(match);
      unknownPlaceholders.push(match);
    }
    return match;
  });

  return { text: result, unknownPlaceholders };
}

/** Serialize mapping for in-request handoff (never persist / log). */
export function mappingToObject(mapping: Map<string, string>): Record<string, string> {
  return Object.fromEntries(mapping);
}

export function mappingFromObject(
  obj: Record<string, string>
): Map<string, string> {
  return new Map(Object.entries(obj));
}
