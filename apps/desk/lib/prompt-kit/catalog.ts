export type PromptKitGoalId = "facts" | "writing";

export type PromptKitAction = {
  id: string;
  title: string;
  description: string;
  /** Prompt-Vorlage; Platzhalter: {{input}} */
  template: string;
};

export type PromptKitGoal = {
  id: PromptKitGoalId;
  title: string;
  description: string;
  /** false = sichtbar, aber ausgegraut / nicht wählbar */
  enabled?: boolean;
  /** Überschrift im Eingabe-Schritt — klare Handlungsanweisung */
  inputHeadline: string;
  /** Kurze Anleitung für den Eingabe-Schritt */
  guide: string;
  inputLabel: string;
  inputPlaceholder: string;
  /** Abschnitte für die Chat-Eingabe (werden in den Prompt übernommen) */
  inputTips: { label: string; insert: string }[];
  actions: PromptKitAction[];
};

export const PROMPT_KIT_GOALS: PromptKitGoal[] = [
  {
    id: "facts",
    title: "Sachverhalt verarbeiten",
    description: "Fallschilderung eingeben und daraus einen KI-Prompt erzeugen.",
    inputHeadline: "Sachverhalt beschreiben",
    guide:
      "Den Fall möglichst ausführlich tippen oder diktieren. Je mehr Informationen, desto besser das Ergebnis. Die Buttons darüber helfen beim Gliedern.",
    inputLabel: "Sachverhalt",
    inputPlaceholder: "Sachverhalt hier eingeben…",
    inputTips: [
      { label: "Beteiligte", insert: "Beteiligte und Rollen: " },
      { label: "Chronologisch", insert: "Chronologisch: " },
      { label: "Ausgangslage", insert: "Ausgangslage: " },
      { label: "Ziel", insert: "Gewünschtes Ziel: " },
    ],
    actions: [
      {
        id: "quick-legal",
        title: "Schnelle Rechtslage",
        description: "Prompt 06 — aktuelle Rechtslage mit Normen und Rechtsprechung.",
        template: `Du bist deutscher Rechtsspezialist.

Sachverhalt:
{{input}}

Gib mir in maximal 7 Sätzen:
1. Die aktuelle Rechtslage nach deutschem Recht
2. Die wichtigsten 3 Paragraphen (mit dejure.org-Links)
3. Ist die Rechtslage eindeutig oder strittig?
4. Was sagt die herrschende Meinung (h.M.)?
5. Gibt es relevante Rechtsprechung der Landgerichte, Oberlandesgerichte oder des BGH — wenn ja welche (Aktenzeichen)?

Erfinde keine Paragraphen oder Urteile
Wenn unsicher: explizit sagen und auf
dejure.org / bundesgerichtshof.de verweisen.`,
      },
    ],
  },
  {
    id: "writing",
    title: "Schreiben erstellen",
    description: "Auftrag oder Stichpunkte eingeben und einen Prompt erzeugen (Schreiben erstellen).",
    enabled: false,
    inputHeadline: "Auftrag beschreiben",
    guide:
      "Möglichst ausführlich tippen oder diktieren, was im Text stehen soll. Je mehr Angaben, desto besser das Ergebnis. Die Buttons darüber helfen beim Gliedern.",
    inputLabel: "Auftrag / Stichpunkte",
    inputPlaceholder: "Auftrag hier eingeben…",
    inputTips: [
      { label: "Adressat", insert: "Adressat: " },
      { label: "Zweck", insert: "Zweck: " },
      { label: "Kernaussagen", insert: "Kernaussagen: " },
      { label: "Ton", insert: "Ton: " },
      { label: "Frist", insert: "Frist / Termin: " },
    ],
    actions: [
      {
        id: "client-letter",
        title: "Mandantenschreiben",
        description: "Verständliches Schreiben an den Mandanten.",
        template: `Formuliere ein professionelles Mandantenschreiben auf Deutsch auf Basis der folgenden Angaben.

Anforderungen:
- Klare Sprache, respektvoll, ohne unnötigen Juristenjargon
- Struktur: Anrede, Anlass, Inhalt, nächste Schritte, Grußformel
- Keine erfundenen Fakten; fehlende Infos als Platzhalter [ … ] markieren

Angaben:
{{input}}`,
      },
      {
        id: "opponent-letter",
        title: "Schreiben an Gegenseite",
        description: "Sachlich-bestimmtes Schreiben an die Gegenseite.",
        template: `Formuliere ein anwaltliches Schreiben an die Gegenseite (Deutschland) auf Basis der folgenden Angaben.

Anforderungen:
- Sachlich, bestimmt, professionell
- Klare Forderung / Position und Frist, soweit aus den Angaben ableitbar
- Fehlende Angaben als Platzhalter [ … ]
- Keine Drohung jenseits üblicher anwaltlicher Formulierungen

Angaben:
{{input}}`,
      },
      {
        id: "internal-memo",
        title: "Aktenvermerk",
        description: "Kurzer interner Vermerk für die Akte.",
        template: `Erstelle einen knappen Aktenvermerk (intern) auf Basis der Angaben.

Struktur:
- Datum / Betreff
- Sachstand
- Rechtliche Einschätzung (kurz)
- Offene Punkte
- Empfohlene nächste Schritte

Angaben:
{{input}}`,
      },
      {
        id: "email-draft",
        title: "E-Mail-Entwurf",
        description: "Kurze, präzise E-Mail für den Kanzleialltag.",
        template: `Entwirf eine kurze professionelle E-Mail auf Deutsch.

Anforderungen:
- Betreffzeile vorschlagen
- Klarer Einstieg, Kernaussage, Call-to-Action
- Angemessener Ton (geschäftlich)
- Fehlendes als [Platzhalter]

Angaben:
{{input}}`,
      },
    ],
  },
];

/** Follow-up-Prompt: KI-Ergebnis kritisch prüfen (nach dem Hauptprompt). */
export const PROMPT_KIT_RESULT_CHECK = `Prüfe dein Ergebnis kritisch auf Richtigkeit und Fehler: eigene Annahmen benennen, Überprüfbares unabhängig neu herleiten, Lücken zeigen. Nichts erfinden, Unsicherheit sagen, Richtiges kurz bestätigen. Am Ende: was ich selbst nachprüfen muss.

Keine Paragraphen, Urteile oder Tatsachen erfinden.`;

/**
 * Folge-Schritt nach Sachverhalt: Mandantenschreiben per KI erzeugen.
 * Eingabe = Freitext (Badges Thema / Kernbotschaft); landet in {{input}}.
 */
export const PROMPT_KIT_CLIENT_LETTER = {
  inputHeadline: "Schreiben vorbereiten",
  guide:
    "Thema und Kernbotschaft möglichst klar tippen oder diktieren. Die Buttons darüber helfen beim Gliedern.",
  inputLabel: "Angaben zum Schreiben",
  inputPlaceholder: "Thema und Kernbotschaft hier eingeben…",
  inputTips: [
    { label: "Thema", insert: "Thema: " },
    { label: "Kernbotschaft", insert: "Kernbotschaft: " },
    { label: "Kurzes Schreiben", insert: "Länge: maximal 1 Seite" },
  ],
  action: {
    id: "client-letter-followup",
    title: "Mandantenschreiben",
    description: "Verständliches Schreiben an den Mandanten.",
    template: `Du bist erfahrener deutscher Rechtsanwalt
mit klarer Mandantenkommunikation.
Erfinde keine Paragraphen oder Urteile.
Wenn unsicher — sag es explizit.
Schreibe ein Mandantenschreiben zu:
{{input}}
Ton: verständlich, kein Juristendeutsch

Best Practice (Orientierung, kein Korsett):
- Fehlende Angaben lieber als Platzhalter {{GROSSBUCHSTABEN}} belassen (z. B. {{VORNAME}}) statt zu erfinden.
- Wenn möglich Struktur: Betreff: … — Anrede — Text — Grußformel.
- Das Schreiben als herunterladbare Markdown-Datei (.md) ausgeben.
- Inhalt der Datei: einfaches Markdown — Stichpunkte mit "- ", Listen mit "1. ", Überschriften mit "## ".
- Tabellen und verschachteltes Markup unnötig.`,
  } satisfies PromptKitAction,
} as const;

export function buildPromptKitOutput(
  template: string,
  input: string
): string {
  return template.replaceAll("{{input}}", input.trim());
}

export function getPromptKitGoal(id: PromptKitGoalId): PromptKitGoal | null {
  return PROMPT_KIT_GOALS.find((goal) => goal.id === id) ?? null;
}
