import { parseMarkdownLetter } from "@/lib/letters/parse-markdown";
import { findPlaceholdersInOrder } from "@/lib/letters/placeholders";

/** Standard-Betreffzeile (Platzhalter bleiben im Text). */
export const DEFAULT_EMAIL_SUBJECT =
  "{{BETREFF}} - {{VORGANG_ODER_AKTENZEICHEN}}";

/** Standard-E-Mail-Text — direkt bearbeitbar, inkl. Platzhalter. */
export const DEFAULT_EMAIL_BODY = `Sehr geehrte{{R_ANREDE}} {{ANREDE}} {{NACHNAME}},

vielen Dank für Ihre Nachricht vom {{DATUM}}.

{{TEXT}}

Für Rückfragen erreichen Sie mich unter {{TELEFON}}. Über eine Rückmeldung bis {{RUECKMELDEFRIST}} würde ich mich freuen.

Mit freundlichen Grüßen

{{ABSENDER_NAME}}
{{FUNKTION}}
{{ORGANISATION}}
{{KONTAKTDATEN}}`;

/** Vollständiger .md-Entwurf (Betreff + Trenner + Text). */
export const DEFAULT_EMAIL_TEMPLATE = `Betreff: ${DEFAULT_EMAIL_SUBJECT}

---

${DEFAULT_EMAIL_BODY}`;

/** Reihenfolge für den Platzhalter-Assistenten (bekannte Felder). */
export const EMAIL_PLACEHOLDER_ORDER = [
  "BETREFF",
  "VORGANG_ODER_AKTENZEICHEN",
  "R_ANREDE",
  "ANREDE",
  "NACHNAME",
  "DATUM",
  "TEXT",
  "TELEFON",
  "RUECKMELDEFRIST",
  "ABSENDER_NAME",
  "FUNKTION",
  "ORGANISATION",
  "KONTAKTDATEN",
] as const;

export const EMAIL_PLACEHOLDER_LABELS: Record<string, string> = {
  BETREFF: "Betreff",
  VORGANG_ODER_AKTENZEICHEN: "Aktenzeichen / Vorgang",
  R_ANREDE: "Anrede (r / e)",
  ANREDE: "Titel",
  NACHNAME: "Nachname",
  DATUM: "Datum der Nachricht",
  TEXT: "Kerninhalt",
  TELEFON: "Telefon",
  RUECKMELDEFRIST: "Rückmeldung bis",
  ABSENDER_NAME: "Ihr Name",
  FUNKTION: "Funktion",
  ORGANISATION: "Kanzlei / Organisation",
  KONTAKTDATEN: "Kontaktdaten",
};

export const EMAIL_PLACEHOLDER_HINTS: Record<string, string> = {
  BETREFF: "Kurzer Betreff ohne Aktenzeichen",
  VORGANG_ODER_AKTENZEICHEN: "Aktenzeichen oder Vorgangsnummer",
  R_ANREDE: "r = Herr, e = Frau, leer = neutral",
  ANREDE: "Herr, Frau, Dr. …",
  NACHNAME: "Nachname des Empfängers",
  DATUM: "Datum der Empfängernachricht",
  TEXT: "Was in der E-Mail stehen soll",
  TELEFON: "Telefonnummer für Rückfragen",
  RUECKMELDEFRIST: "Frist für Rückmeldung",
  ABSENDER_NAME: "Ihr Name in der Signatur",
  FUNKTION: "z. B. Rechtsanwalt",
  ORGANISATION: "Kanzleiname",
  KONTAKTDATEN: "Adresse, E-Mail, Web …",
};

export const EMAIL_MULTILINE_PLACEHOLDERS = new Set(["TEXT", "KONTAKTDATEN"]);

/** Offene Platzhalter in sinnvoller Reihenfolge. */
export function listOpenEmailPlaceholders(subject: string, body: string): string[] {
  const open = new Set(findPlaceholdersInOrder(subject, body));
  const ordered: string[] = EMAIL_PLACEHOLDER_ORDER.filter((name) =>
    open.has(name)
  );
  for (const name of open) {
    if (!ordered.includes(name)) {
      ordered.push(name);
    }
  }
  return ordered;
}

export function defaultEmailContent(): {
  subject: string;
  body: string;
} {
  return {
    subject: DEFAULT_EMAIL_SUBJECT,
    body: DEFAULT_EMAIL_BODY,
  };
}

const EMAIL_SEPARATOR = /\n---\n/;

export function serializeEmailDraft(fields: {
  subject: string;
  salutation: string;
  body: string;
  closing: string;
}): string {
  const betreffLine = fields.subject.trim()
    ? /^Betreff:/i.test(fields.subject.trim())
      ? fields.subject.trim()
      : `Betreff: ${fields.subject.trim()}`
    : "Betreff:";

  const tailParts = [fields.salutation, fields.body, fields.closing].filter(
    (part) => part.trim()
  );

  if (tailParts.length === 0) {
    return betreffLine;
  }

  return `${betreffLine}\n---\n${tailParts.join("\n\n")}`;
}

/** E-Mail-Entwurf (Betreff + --- + Text) in Brief-Felder zerlegen. */
export function parseEmailDraft(raw: string): {
  subject: string;
  salutation: string;
  body: string;
  closing: string;
} {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) {
    return { subject: "", salutation: "", body: "", closing: "" };
  }

  const sepMatch = text.match(EMAIL_SEPARATOR);
  if (!sepMatch || sepMatch.index === undefined) {
    return parseMarkdownLetter(text);
  }

  const head = text.slice(0, sepMatch.index).trim();
  const tail = text.slice(sepMatch.index + sepMatch[0].length).trim();

  let subject = head;
  const betreffMatch = head.match(/^Betreff:\s*(.*)$/i);
  if (betreffMatch) {
    subject = betreffMatch[1].trim();
  }

  return {
    subject,
    salutation: "",
    body: tail,
    closing: "",
  };
}

export function isEmptyLetterFields(fields: {
  subject: string;
  salutation: string;
  body: string;
  closing: string;
}): boolean {
  return (
    !fields.subject.trim() &&
    !fields.salutation.trim() &&
    !fields.body.trim() &&
    !fields.closing.trim()
  );
}

/** Interner Listen-Titel für E-Mails — immer der Betreff. */
export function resolveEmailLetterTitle(subject: string): string {
  const trimmed = subject.trim();
  return trimmed || "Betreff";
}
