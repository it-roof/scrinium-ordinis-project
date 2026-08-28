import type { LetterKind } from "./types";

export type LetterDocumentModel = {
  title: string;
  kind: LetterKind;
  subject: string;
  salutation: string;
  body: string;
  closing: string;
};

export type BodyBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "numbered"; text: string; n: number }
  | { type: "heading"; text: string };

const BULLET_RE = /^\s*([-•*]|\u2022)\s+(.+)$/;
const NUMBERED_RE = /^\s*(\d+)[.)]\s+(.+)$/;
const HEADING_RE = /^\s{0,3}#{1,3}\s+(.+)$/;

/** Absätze aus Body (Leerzeilen trennen). */
export function bodyParagraphs(body: string): string[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Body in Blöcke für PDF/Word: Absätze, Stichpunkte, nummerierte Listen, Überschriften.
 * Marker: "- "/"* "/"• ", "1. ", optional "## Titel".
 */
export function bodyBlocks(body: string): BodyBlock[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: BodyBlock[] = [];
  let paragraphLines: string[] = [];

  function flushParagraph() {
    const text = paragraphLines.join("\n").trim();
    paragraphLines = [];
    if (text) {
      blocks.push({ type: "paragraph", text });
    }
  }

  for (const raw of lines) {
    if (!raw.trim()) {
      flushParagraph();
      continue;
    }

    const bullet = raw.match(BULLET_RE);
    if (bullet) {
      flushParagraph();
      blocks.push({ type: "bullet", text: bullet[2].trim() });
      continue;
    }

    const numbered = raw.match(NUMBERED_RE);
    if (numbered) {
      flushParagraph();
      blocks.push({
        type: "numbered",
        n: Number.parseInt(numbered[1], 10),
        text: numbered[2].trim(),
      });
      continue;
    }

    const heading = raw.match(HEADING_RE);
    if (heading) {
      flushParagraph();
      blocks.push({ type: "heading", text: heading[1].trim() });
      continue;
    }

    paragraphLines.push(raw);
  }

  flushParagraph();
  return blocks;
}

export function letterFilename(
  title: string,
  ext: "pdf" | "docx" | "md"
): string {
  const base =
    title
      .trim()
      .replace(/[^\w\-äöüÄÖÜß]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "schreiben";
  return `${base}.${ext}`;
}
