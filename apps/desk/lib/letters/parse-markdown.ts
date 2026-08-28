/**
 * Optional: Claude-/Markdown-Paste in Brief-Felder zerlegen.
 * Erwartet einfache Überschriften wie **Betreff:** / Anrede: / Schluss:
 */
export function parseMarkdownLetter(raw: string): {
  subject: string;
  salutation: string;
  body: string;
  closing: string;
} {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) {
    return { subject: "", salutation: "", body: "", closing: "" };
  }

  let subject = "";
  let salutation = "";
  let closing = "";
  let body = text;

  const subjectMatch = text.match(
    /(?:^|\n)\s*(?:\*\*)?Betreff(?:\*\*)?\s*:\s*(.+?)(?=\n|$)/i
  );
  if (subjectMatch) {
    subject = subjectMatch[1].trim();
    body = body.replace(subjectMatch[0], "\n").trim();
  }

  const salutationMatch = body.match(
    /^(Sehr geehrte[^\n]+|Liebe[^\n]+|Guten Tag[^\n]+|Hallo[^\n]+)\s*\n+/i
  );
  if (salutationMatch) {
    salutation = salutationMatch[1].trim();
    body = body.slice(salutationMatch[0].length).trim();
  }

  const closingMatch = body.match(
    /\n+(Mit freundlichen Grüßen[^\n]*|Freundliche Grüße[^\n]*|Hochachtungsvoll[^\n]*|Beste Grüße[^\n]*)\s*$/i
  );
  if (closingMatch) {
    closing = closingMatch[1].trim();
    body = body.slice(0, closingMatch.index).trim();
  }

  return { subject, salutation, body, closing };
}

/** Brief-Felder wieder als einfaches Markdown für .md-Datei. */
export function serializeMarkdownLetter(fields: {
  subject: string;
  salutation: string;
  body: string;
  closing: string;
}): string {
  const parts: string[] = [];
  if (fields.subject.trim()) {
    parts.push(`Betreff: ${fields.subject.trim()}`);
  }
  if (fields.salutation.trim()) {
    parts.push(fields.salutation.trim());
  }
  if (fields.body.trim()) {
    parts.push(fields.body.trim());
  }
  if (fields.closing.trim()) {
    parts.push(fields.closing.trim());
  }
  return `${parts.join("\n\n")}\n`;
}

export function isMarkdownFilename(name: string): boolean {
  return /\.md$/i.test(name.trim());
}
