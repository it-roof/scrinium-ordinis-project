import PDFDocument from "pdfkit";

import type { UserNote } from "./types";

const PAGE_MARGINS = { top: 72, bottom: 72, left: 72, right: 72 } as const;

function createPdfDocument(title: string): PDFKit.PDFDocument {
  return new PDFDocument({
    size: "A4",
    margins: PAGE_MARGINS,
    info: {
      Title: title || "Notiz",
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

function writeParagraph(
  doc: PDFKit.PDFDocument,
  text: string,
  options?: { bold?: boolean; size?: number; color?: string; spaceAfter?: number }
) {
  resetCursor(doc);
  doc.font(options?.bold ? "Helvetica-Bold" : "Helvetica");
  doc
    .fontSize(options?.size ?? 12)
    .fillColor(options?.color ?? "#111111")
    .text(text, {
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

function formatNoteDate(value: string): string {
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function notePdfFilename(title: string): string {
  const base =
    title
      .trim()
      .replace(/[^\w\-äöüÄÖÜß]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "notiz";
  return `${base}.pdf`;
}

/** Persönliche Notiz als schlichtes A4-PDF (Titel, Datum, Text, Dateiliste). */
export async function buildNotePdf(note: UserNote): Promise<Buffer> {
  const title = note.title.trim() || "Ohne Titel";
  const doc = createPdfDocument(title);
  const done = collectPdfBuffer(doc);

  writeParagraph(doc, title, { bold: true, size: 16, spaceAfter: 0.35 });
  writeParagraph(doc, `Zuletzt geändert ${formatNoteDate(note.updatedAt)}`, {
    size: 10,
    color: "#555555",
    spaceAfter: 1,
  });

  const body = note.body.replace(/\r\n/g, "\n").trim();
  if (body) {
    const paragraphs = body.split(/\n{2,}/);
    for (const paragraph of paragraphs) {
      const lines = paragraph.split("\n");
      for (const line of lines) {
        writeParagraph(doc, line.length > 0 ? line : " ", { spaceAfter: 0.15 });
      }
      doc.moveDown(0.45);
      resetCursor(doc);
    }
  } else {
    writeParagraph(doc, "Kein Inhalt.", {
      color: "#555555",
      spaceAfter: 0.7,
    });
  }

  if (note.files.length > 0) {
    doc.moveDown(0.5);
    writeParagraph(doc, "Dokumente", { bold: true, spaceAfter: 0.4 });
    for (const file of note.files) {
      writeParagraph(doc, `• ${file.filename}`, { spaceAfter: 0.2 });
    }
  }

  doc.end();
  return done;
}
