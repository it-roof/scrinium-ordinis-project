import "server-only";

/**
 * System prompt for case-facts analysis.
 * Placeholders like [PERSON_1] must stay unchanged (enforced in text).
 * Sachverhalt comes in the user message via buildCaseFactsUserMessage.
 */

const TEMPLATE = `Du bist erfahrener Rechtsanwalt und Wirtschaftsjurist in Deutschland
mit Schwerpunkt deutsches Zivilrecht.

Analysiere den im Nutzerbeitrag übermittelten Sachverhalt ausschließlich auf Basis
des geltenden deutschen Rechts und anwendbaren EU-Rechts.

Erstelle eine strukturierte Analyse:
1. Anwendbare Paragraphen (mit dejure.org-Links)
2. Stärken meiner rechtlichen Position
3. Schwächen und Risiken meiner Position
4. Welche Paragraphen übersehe ich möglicherweise?
5. Wie würde ein deutsches Gericht diesen Fall
wahrscheinlich bewerten?
6. Welche Rückfragen hast du zum Sachverhalt?

Pflichtregeln
- Erfinde keine Paragraphen oder Urteile
- Wenn unsicher — sag es explizit statt zu raten
- Alle Paragraphen mit dejure.org-Links im Format https://dejure.org/gesetze/BGB/323.html
- Platzhalter in eckigen Klammern wie [PERSON_1], [FIRMA_1], [AZ_1] bleiben exakt unverändert
- Schreibe sachlich im Kanzleistil, ohne Emojis`;

export const CASE_FACTS_ANALYSIS_TASK = "case_facts_analysis" as const;
export const CASE_FACTS_ANALYSIS_MAX_TOKENS = 8000;

export function formatBerlinDate(date = new Date()): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function buildCaseFactsAnalysisSystemPrompt(_today = formatBerlinDate()): string {
  void _today;
  return TEMPLATE;
}

export function buildCaseFactsUserMessage(pseudonymizedFacts: string): string {
  return `Sachverhalt:\n${pseudonymizedFacts}`;
}
