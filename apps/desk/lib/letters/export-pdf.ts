import PDFDocument from "pdfkit";

import { bodyBlocks, type LetterDocumentModel } from "./document-model";

export async function buildLetterPdf(
  model: LetterDocumentModel
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      info: {
        Title: model.title || "Schreiben",
        Author: "Scrinium Ordinis",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bulletIndent = 18;
    const bulletTextWidth = pageWidth - bulletIndent;

    doc.font("Times-Roman").fontSize(12).fillColor("#111111");

    if (model.subject.trim()) {
      doc.font("Times-Bold").text(`Betreff: ${model.subject.trim()}`);
      doc.moveDown(1.2);
      doc.font("Times-Roman");
    }

    if (model.salutation.trim()) {
      doc.text(model.salutation.trim());
      doc.moveDown(1);
    }

    for (const block of bodyBlocks(model.body)) {
      if (block.type === "heading") {
        doc.font("Times-Bold").text(block.text, { lineGap: 2 });
        doc.font("Times-Roman");
        doc.moveDown(0.6);
        continue;
      }

      if (block.type === "bullet") {
        const startX = doc.x;
        const startY = doc.y;
        doc.text("•", startX, startY, { width: bulletIndent, lineBreak: false });
        doc.text(block.text, startX + bulletIndent, startY, {
          width: bulletTextWidth,
          align: "left",
          lineGap: 2,
        });
        doc.moveDown(0.35);
        continue;
      }

      if (block.type === "numbered") {
        const startX = doc.x;
        const startY = doc.y;
        const label = `${block.n}.`;
        doc.text(label, startX, startY, {
          width: bulletIndent,
          lineBreak: false,
        });
        doc.text(block.text, startX + bulletIndent, startY, {
          width: bulletTextWidth,
          align: "left",
          lineGap: 2,
        });
        doc.moveDown(0.35);
        continue;
      }

      doc.text(block.text, { align: "justify", lineGap: 2 });
      doc.moveDown(0.85);
    }

    if (model.closing.trim()) {
      doc.moveDown(0.5);
      doc.text(model.closing.trim());
    }

    doc.end();
  });
}
