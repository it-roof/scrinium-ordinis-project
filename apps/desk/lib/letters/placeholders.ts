/** Platzhalter {{NAME}} — nur Großbuchstaben, Ziffern, Unterstrich. */

const PLACEHOLDER_RE = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;

export type PlaceholderTextSegment =
  | { kind: "text"; value: string }
  | { kind: "placeholder"; value: string; name: string };

/** Text in Segmente für Platzhalter-Hervorhebung zerlegen. */
export function segmentTextWithPlaceholders(text: string): PlaceholderTextSegment[] {
  const segments: PlaceholderTextSegment[] = [];
  let lastIndex = 0;
  PLACEHOLDER_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = PLACEHOLDER_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }
    segments.push({
      kind: "placeholder",
      value: match[0],
      name: match[1],
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

export function findPlaceholders(...texts: string[]): string[] {
  const found = new Set<string>();
  for (const text of texts) {
    PLACEHOLDER_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PLACEHOLDER_RE.exec(text)) !== null) {
      found.add(match[1]);
    }
  }
  return [...found].sort((a, b) => a.localeCompare(b, "de"));
}

/** Platzhalter in Lesereihenfolge (Betreff, dann Text). */
export function findPlaceholdersInOrder(...texts: string[]): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const text of texts) {
    PLACEHOLDER_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PLACEHOLDER_RE.exec(text)) !== null) {
      if (!seen.has(match[1])) {
        seen.add(match[1]);
        order.push(match[1]);
      }
    }
  }
  return order;
}

export function applyPlaceholders(
  text: string,
  values: Record<string, string>
): string {
  return text.replace(PLACEHOLDER_RE, (full, name: string) => {
    const value = values[name];
    if (value === undefined || value.trim() === "") {
      return full;
    }
    return value;
  });
}

export function applyPlaceholdersToFields<
  T extends {
    subject: string;
    salutation: string;
    body: string;
    closing: string;
  },
>(fields: T, values: Record<string, string>): T {
  return {
    ...fields,
    subject: applyPlaceholders(fields.subject, values),
    salutation: applyPlaceholders(fields.salutation, values),
    body: applyPlaceholders(fields.body, values),
    closing: applyPlaceholders(fields.closing, values),
  };
}
