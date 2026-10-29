/**
 * Pattern-only pseudonymization before Bedrock.
 * Mapping stays in request memory; never log or persist.
 */

export type EntityType = "IBAN" | "EMAIL" | "PHONE" | "AZ" | "OTHER";

export type PseudonymizeResult = {
  text: string;
  mapping: Map<string, string>;
};

const PLACEHOLDER_RE = /\[([A-Z]+)_(\d+)\]/g;

const PATTERN_DEFS: { type: EntityType; regex: RegExp }[] = [
  {
    type: "IBAN",
    regex: /\bDE\s?\d{2}(?:\s?\d{4}){4}\s?\d{2}\b/gi,
  },
  {
    type: "EMAIL",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    type: "PHONE",
    regex: /(?:\+49|0)\s?(?:\d[\s\-./]?){6,14}\d\b/g,
  },
  {
    type: "AZ",
    regex: /\b\d{1,3}\s+[A-ZÄÖÜ]{1,4}\s+\d{1,5}\/\d{2,4}\b/g,
  },
];

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export function pseudonymize(text: string): PseudonymizeResult {
  const mapping = new Map<string, string>();
  const valueToPlaceholder = new Map<string, string>();
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

  let result = text;
  for (const { type, regex } of PATTERN_DEFS) {
    result = result.replace(regex, (match) => nextPlaceholder(type, match));
  }

  return { text: result, mapping };
}

export function mergeMappings(
  target: Map<string, string>,
  source: Map<string, string>
): void {
  for (const [placeholder, original] of source) {
    target.set(placeholder, original);
  }
}

export function repersonalize(
  text: string,
  mapping: Map<string, string>
): string {
  return text.replace(PLACEHOLDER_RE, (match) => mapping.get(match) ?? match);
}
