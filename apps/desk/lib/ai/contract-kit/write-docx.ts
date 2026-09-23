/**
 * Lightweight contract toolkit: Markdown/plain text → DOCX buffer.
 * Pure enough for Vitest (no server-only).
 */

import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

export type WriteContractDocxInput = {
  title: string;
  body: string;
};

export type WriteContractDocxResult =
  | { ok: true; buffer: Buffer; filename: string }
  | { ok: false; error: string };

const MAX_TITLE = 120;
const MAX_BODY = 200_000;

function sanitizeFilename(title: string): string {
  const base = title
    .trim()
    .replace(/[^\p{L}\p{N}\-_ .]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${base || "Vertrag"}.docx`;
}

function stripMdNoise(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\*\s+/, "• ")
    .replace(/^-\s+/, "• ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .trim();
}

function bodyToParagraphs(body: string): Paragraph[] {
  const blocks = body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const out: Paragraph[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const first = lines[0] ?? "";
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(first);
    if (headingMatch && lines.length === 1) {
      const level =
        headingMatch[1].length === 1
          ? HeadingLevel.HEADING_1
          : headingMatch[1].length === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3;
      out.push(
        new Paragraph({
          text: stripMdNoise(headingMatch[2]),
          heading: level,
          spacing: { after: 200 },
        })
      );
      continue;
    }

    for (const line of lines) {
      const text = stripMdNoise(line);
      if (!text) continue;
      out.push(
        new Paragraph({
          children: [new TextRun({ text, size: 22 })],
          spacing: { after: 120 },
        })
      );
    }
  }
  return out;
}

/**
 * Build a DOCX from title + body (plain text or light Markdown).
 */
export async function writeContractDocx(
  input: WriteContractDocxInput
): Promise<WriteContractDocxResult> {
  const title = (input.title ?? "").trim().slice(0, MAX_TITLE);
  const body = (input.body ?? "").trim();
  if (!body) {
    return { ok: false, error: "Vertragstext fehlt." };
  }
  if (body.length > MAX_BODY) {
    return { ok: false, error: "Vertragstext zu lang." };
  }

  const children: Paragraph[] = [];
  if (title) {
    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        spacing: { after: 300 },
      })
    );
  }
  children.push(...bodyToParagraphs(body));
  if (children.length === 0) {
    return { ok: false, error: "Vertragstext fehlt." };
  }

  const doc = new Document({
    sections: [{ children }],
  });
  const buffer = Buffer.from(await Packer.toBuffer(doc));
  return {
    ok: true,
    buffer,
    filename: sanitizeFilename(title || "Vertrag"),
  };
}
