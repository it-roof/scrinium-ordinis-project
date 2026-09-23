import { describe, expect, it } from "vitest";

import {
  detectContractUploadKind,
  normalizeExtractedContractText,
  validateContractUploadMeta,
} from "./contract-extract";

describe("detectContractUploadKind", () => {
  it("erkennt docx und pdf", () => {
    expect(
      detectContractUploadKind(
        "vertrag.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe("docx");
    expect(detectContractUploadKind("x.pdf", "application/pdf")).toBe("pdf");
  });

  it("lehnt alte .doc und fremde Typen ab", () => {
    expect(detectContractUploadKind("alt.doc", "application/msword")).toBeNull();
    expect(detectContractUploadKind("x.txt", "text/plain")).toBeNull();
  });
});

describe("validateContractUploadMeta", () => {
  it("prüft Größe und Typ", () => {
    expect(
      validateContractUploadMeta("a.pdf", 100, "application/pdf")
    ).toBeNull();
    expect(
      validateContractUploadMeta("a.pdf", 0, "application/pdf")
    ).toMatch(/leer/i);
    expect(
      validateContractUploadMeta("a.txt", 100, "text/plain")
    ).toMatch(/docx|pdf/i);
  });
});

describe("normalizeExtractedContractText", () => {
  it("räumt Whitespace auf", () => {
    expect(normalizeExtractedContractText("  a  \n\n\n  b  ")).toBe("a\n\nb");
  });
});
