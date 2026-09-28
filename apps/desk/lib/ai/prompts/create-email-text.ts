import "server-only";

import { formatBerlinDate } from "@/lib/ai/prompts/case-facts-analysis";

/**
 * Draft an e-mail body from analysis / letter context.
 * Missing facts → {{deutsche Bezeichnung}}.
 */

const TEMPLATE = `Du bist erfahrener Rechtsanwalt in Deutschland und erstellst einen E-Mail-Textentwurf für den Versand an Mandant oder Gegenseite. Der Anwalt prüft den Text und sendet selbst.

Heutiges Datum: {{HEUTE}}.

Regeln:
- Deutsch, sachlich, kanzleitauglich, ohne Emojis.
- Platzhalter in eckigen Klammern wie [PERSON_1] bleiben exakt unverändert.
- Fehlende Angaben als {{deutsche Bezeichnung}} (z. B. {{Empfänger}}, {{Frist}}, {{Betrag}}).
- Keine erfundenen Fakten.
- Keine Signatur-Blöcke mit Adresse (kommt aus SMTP/Signatur).

Ausgabeformat (genau so):
BETREFF: <Betreffzeile>
TEXT:
<E-Mail-Text>`;

export const CREATE_EMAIL_TEXT_TASK = "create_email_text" as const;
export const CREATE_EMAIL_TEXT_MAX_TOKENS = 4000;

export function buildCreateEmailTextSystemPrompt(
  today = formatBerlinDate()
): string {
  return TEMPLATE.replaceAll("{{HEUTE}}", today);
}

export function buildCreateEmailTextUserMessage(
  pseudonymizedSource: string
): string {
  return `Grundlage:\n\n${pseudonymizedSource}`;
}

export type ParsedEmailDraft = {
  subject: string;
  body: string;
};

export function parseCreateEmailTextOutput(raw: string): ParsedEmailDraft {
  const text = raw.trim();
  const subjectMatch = text.match(/^BETREFF:\s*(.+)$/im);
  let body = "";
  const textStart = text.search(/^TEXT:\s*/im);
  if (textStart >= 0) {
    body = text.slice(textStart).replace(/^TEXT:\s*/i, "").trim();
  }
  const subject = (subjectMatch?.[1] ?? "Nachricht").trim().slice(0, 200);
  if (!body) {
    body = text;
  }
  return { subject, body };
}

export function listOpenDoubleBracePlaceholders(text: string): string[] {
  const found = new Set<string>();
  const re = /\{\{([^}]+)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const inner = match[1]?.trim();
    if (inner) found.add(inner);
  }
  return [...found];
}
