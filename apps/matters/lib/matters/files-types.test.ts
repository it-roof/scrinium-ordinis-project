import { describe, expect, it } from "vitest";

import {
  extractableDocumentFormat,
  formatFileSize,
  nextUniqueMatterFilename,
  validateMatterFileMeta,
} from "@/lib/matters/files-types";

describe("validateMatterFileMeta", () => {
  it("lehnt leere und zu große Dateien ab", () => {
    expect(validateMatterFileMeta("a.pdf", 0)).toBeTruthy();
    expect(validateMatterFileMeta("a.pdf", 51 * 1024 * 1024)).toBeTruthy();
    expect(validateMatterFileMeta("a.exe", 10)).toBeTruthy();
  });

  it("erlaubt PDF und Bilder", () => {
    expect(validateMatterFileMeta("schreiben.pdf", 1200)).toBeNull();
    expect(validateMatterFileMeta("scan.jpg", 1200)).toBeNull();
  });
});

describe("nextUniqueMatterFilename", () => {
  it("hängt Kopie an", () => {
    expect(nextUniqueMatterFilename("brief.pdf", ["brief.pdf"])).toBe(
      "brief Kopie.pdf"
    );
  });
});

describe("formatFileSize", () => {
  it("formatiert Bytes und Megabytes", () => {
    expect(formatFileSize(800)).toBe("800 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});

describe("extractableDocumentFormat", () => {
  it("erkennt PDF und DOCX", () => {
    expect(extractableDocumentFormat("a.pdf")).toBe("pdf");
    expect(extractableDocumentFormat("a.DOCX")).toBe("docx");
    expect(extractableDocumentFormat("a.png")).toBeNull();
  });
});
