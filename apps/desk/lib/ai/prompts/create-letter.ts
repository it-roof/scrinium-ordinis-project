import "server-only";

import { formatBerlinDate } from "@/lib/ai/prompts/case-facts-analysis";

/**
 * Draft a formal letter from a prior analysis / counter-review.
 * Missing facts → {{deutsche Bezeichnung}}.
 */

const TEMPLATE = `Du bist erfahrener Rechtsanwalt in Deutschland und erstellst einen Entwurf für ein anwaltliches Schreiben auf Basis einer Analyse (ggf. inkl. Gegenprüfung). Der Entwurf wird vom Anwalt geprüft und als neues Schreiben in der Akte gespeichert.

Heutiges Datum: {{HEUTE}}.

Regeln:
- Schreibe auf Deutsch, sachlich, kanzleitauglich, ohne Emojis.
- Platzhalter in eckigen Klammern wie [PERSON_1], [FIRMA_1] bleiben exakt unverändert (werden später ersetzt).
- Fehlende Angaben, die der Anwalt ergänzen muss, als {{deutsche Bezeichnung}} — z. B. {{Gegner}}, {{Frist}}, {{Aktenzeichen Gegner}}, {{Betrag}}.
- Keine erfundenen Fakten. Wenn unsicher: {{…}} oder kurze Rückfrage im Text.
- Kein Briefkopf / keine Kanzleiadresse (kommt aus der Vorlage).
- Normenkürzel nur, wo sie den Text tragen; keine Urteilsaktenzeichen.

Ausgabeformat (genau so, ohne Einleitung davor):
TITEL: <kurzer Betreff-/Dokumenttitel>
ANREDE: <Anredezeile oder {{Anrede}}>
TEXT:
<Brieftext, Absätze mit Leerzeile>
SCHLUSS: <Schlussformel, z. B. Mit freundlichen Grüßen>`;

export const CREATE_LETTER_TASK = "create_letter" as const;
export const CREATE_LETTER_MAX_TOKENS = 6000;

export function buildCreateLetterSystemPrompt(
  today = formatBerlinDate()
): string {
  return TEMPLATE.replaceAll("{{HEUTE}}", today);
}

export function buildCreateLetterUserMessage(
  pseudonymizedSource: string
): string {
  return `Grundlage (Analyse / Gegenprüfung):\n\n${pseudonymizedSource}`;
}

export type ParsedLetterDraft = {
  title: string;
  salutation: string;
  body: string;
  closing: string;
};

/** Best-effort parse of the structured model output. */
export function parseCreateLetterOutput(raw: string): ParsedLetterDraft {
  const text = raw.trim();
  const titleMatch = text.match(/^TITEL:\s*(.+)$/im);
  const salutationMatch = text.match(/^ANREDE:\s*(.+)$/im);
  const closingMatch = text.match(/^SCHLUSS:\s*(.+)$/im);

  let body = "";
  const textStart = text.search(/^TEXT:\s*/im);
  if (textStart >= 0) {
    const afterLabel = text.slice(textStart).replace(/^TEXT:\s*/i, "");
    const schlussIdx = afterLabel.search(/^SCHLUSS:\s*/im);
    body = (schlussIdx >= 0 ? afterLabel.slice(0, schlussIdx) : afterLabel)
      .trim();
  }

  const title = (titleMatch?.[1] ?? "Schreiben").trim().slice(0, 200);
  const salutation = (salutationMatch?.[1] ?? "").trim();
  const closing = (closingMatch?.[1] ?? "").trim();
  if (!body) {
    body = text;
  }

  return { title, salutation, body, closing };
}
