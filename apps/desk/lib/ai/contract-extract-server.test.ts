import { Document, Packer, Paragraph, TextRun } from "docx";
import { describe, expect, it } from "vitest";

import { extractContractTextFromBuffer } from "./contract-extract-server";

describe("extractContractTextFromBuffer", () => {
  it("extrahiert Text aus DOCX", async () => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun(
                  "Dies ist ein Testvertrag mit Klauseln zur Haftung und Kündigung."
                ),
              ],
            }),
          ],
        },
      ],
    });
    const buffer = Buffer.from(await Packer.toBuffer(doc));
    const result = await extractContractTextFromBuffer({
      buffer,
      filename: "test.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.kind).toBe("docx");
    expect(result.text).toMatch(/Testvertrag/);
    expect(result.text).toMatch(/Haftung/);
  });

  it("lehnt leere PDF mit klarer Meldung ab", async () => {
    const buffer = Buffer.from("%PDF-1.4\n%%EOF\n");
    const result = await extractContractTextFromBuffer({
      buffer,
      filename: "leer.pdf",
      mimeType: "application/pdf",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Scan|Text|PDF/i);
  });
});
