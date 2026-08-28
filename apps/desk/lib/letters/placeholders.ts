/** Platzhalter {{NAME}} — nur Großbuchstaben, Ziffern, Unterstrich. */

const PLACEHOLDER_RE = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;

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
