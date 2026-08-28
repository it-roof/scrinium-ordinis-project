import PDFDocument from "pdfkit";

import { bodyBlocks, type LetterDocumentModel } from "./document-model";

const PAGE_MARGINS = { top: 72, bottom: 72, left: 72, right: 72 } as const;

function createPdfDocument(title: string): PDFKit.PDFDocument {
  return new PDFDocument({
    size: "A4",
    margins: PAGE_MARGINS,
    info: {
      Title: title || "Dokument",
      Author: "Scrinium Ordinis",
    },
  });
}

function collectPdfBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function contentWidth(doc: PDFKit.PDFDocument): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function resetCursor(doc: PDFKit.PDFDocument) {
  doc.x = doc.page.margins.left;
}

/** Fließtext links ausgerichtet — kein Justify (wirkt bei Briefen oft unruhig). */
function writeParagraph(
  doc: PDFKit.PDFDocument,
  text: string,
  options?: { bold?: boolean; spaceAfter?: number }
) {
  resetCursor(doc);
  if (options?.bold) {
    doc.font("Times-Bold");
  } else {
    doc.font("Times-Roman");
  }
  doc.fontSize(12).fillColor("#111111").text(text, {
    width: contentWidth(doc),
    align: "left",
    lineGap: 2,
  });
  if (options?.spaceAfter !== undefined) {
    doc.moveDown(options.spaceAfter);
  } else {
    doc.moveDown(0.7);
  }
  resetCursor(doc);
}

function writeListItem(
  doc: PDFKit.PDFDocument,
  marker: string,
  text: string
) {
  resetCursor(doc);
  doc.font("Times-Roman").fontSize(12).fillColor("#111111");
  const width = contentWidth(doc);
  const markerWidth = 18;
  const startX = doc.page.margins.left;
  const startY = doc.y;

  doc.text(marker, startX, startY, {
    width: markerWidth,
    lineBreak: false,
  });
  doc.text(text, startX + markerWidth, startY, {
    width: width - markerWidth,
    align: "left",
    lineGap: 2,
  });
  doc.moveDown(0.35);
  resetCursor(doc);
}

function writeBodyBlocks(doc: PDFKit.PDFDocument, body: string) {
  for (const block of bodyBlocks(body)) {
    if (block.type === "heading") {
      doc.moveDown(0.35);
      writeParagraph(doc, block.text, { bold: true, spaceAfter: 0.45 });
      continue;
    }

    if (block.type === "bullet") {
      writeListItem(doc, "•", block.text);
      continue;
    }

    if (block.type === "numbered") {
      writeListItem(doc, `${block.n}.`, block.text);
      continue;
    }

    // Briefkopf/Adresszeilen: Zeilen einzeln, kompakt
    const lines = block.text.split("\n").map((line) => line.trimEnd());
    if (lines.length > 1 && lines.every((line) => line.length < 90)) {
      for (const line of lines) {
        writeParagraph(doc, line || " ", { spaceAfter: 0.05 });
      }
      doc.moveDown(0.45);
      resetCursor(doc);
      continue;
    }

    writeParagraph(doc, block.text);
  }
}

export async function buildLetterPdf(
  model: LetterDocumentModel
): Promise<Buffer> {
  const doc = createPdfDocument(model.title || "Schreiben");
  const done = collectPdfBuffer(doc);

  doc.font("Times-Roman").fontSize(12).fillColor("#111111");

  if (model.subject.trim()) {
    writeParagraph(doc, `Betreff: ${model.subject.trim()}`, {
      bold: true,
      spaceAfter: 1,
    });
  }

  if (model.salutation.trim()) {
    writeParagraph(doc, model.salutation.trim());
  }

  writeBodyBlocks(doc, model.body);

  if (model.closing.trim()) {
    doc.moveDown(0.4);
    writeParagraph(doc, model.closing.trim(), { spaceAfter: 0.8 });
  }

  doc.end();
  return done;
}

/**
 * Markdown 1:1 als PDF — ohne Zerlegung in Betreff/Anrede/Schluss.
 * Für „Dokument drucken“ aus dem Prompt-Baukasten.
 */
export async function buildMarkdownPdf(markdown: string): Promise<Buffer> {
  const text = markdown.replace(/\r\n/g, "\n").trim();
  const titleMatch = text.match(/^\s{0,3}#{1,3}\s+(.+)$/m);
  const title = titleMatch?.[1]?.replace(/^Betreff:\s*/i, "").trim() || "Dokument";

  const doc = createPdfDocument(title);
  const done = collectPdfBuffer(doc);

  doc.font("Times-Roman").fontSize(12).fillColor("#111111");
  writeBodyBlocks(doc, text);

  doc.end();
  return done;
}
