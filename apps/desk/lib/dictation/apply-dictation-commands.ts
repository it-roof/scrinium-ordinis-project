/**
 * Einfache Diktier-Steuerworte (DE), wie Anwälte sie von Diktiergeräten kennen.
 * Längere Phrasen zuerst ersetzen.
 */
const DICTATION_COMMANDS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bneuer\s+absatz\b/gi, "\n\n"],
  [/\babsatz\b/gi, "\n\n"],
  [/\bneue\s+zeile\b/gi, "\n"],
  [/\bzeilenumbruch\b/gi, "\n"],
  [/\bfragezeichen\b/gi, "?"],
  [/\bausrufezeichen\b/gi, "!"],
  [/\bdoppelpunkt\b/gi, ":"],
  [/\bstrichpunkt\b/gi, ";"],
  [/\bsemikolon\b/gi, ";"],
  [/\bgedankenstrich\b/gi, " – "],
  [/\bbindestrich\b/gi, "-"],
  [/\bkomma\b/gi, ","],
  [/\bpunkt\b/gi, "."],
  [/\bparagraph\b/gi, "§"],
];

/** Leerzeichen vor Satzzeichen entfernen, doppelte Spaces glätten. */
function tidyDictationSpacing(text: string): string {
  return text
    .replace(/[^\S\n]+/g, " ")
    .replace(/ +([.,!?;:])/g, "$1")
    .replace(/([.,!?;:])(?=[^\s\n.,!?;:])/g, "$1 ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ +$/gm, "")
    .trimStart();
}

/**
 * Ersetzt gesprochene Steuerworte durch Zeichen/Absätze.
 * Idempotent genug für Live-Vorschau und Übernehmen.
 */
export function applyDictationCommands(text: string): string {
  if (!text.trim()) {
    return text;
  }

  let next = text;
  for (const [pattern, replacement] of DICTATION_COMMANDS) {
    next = next.replace(pattern, replacement);
  }
  return tidyDictationSpacing(next);
}
