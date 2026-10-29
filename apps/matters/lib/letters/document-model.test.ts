import { describe, expect, it } from "vitest";

import { bodyBlocks, letterFilename } from "@/lib/letters/document-model";

describe("bodyBlocks", () => {
  it("erkennt Absätze und Listen", () => {
    const blocks = bodyBlocks("Hallo.\n\n- Punkt\n1. Eins\n## Titel");
    expect(blocks).toEqual([
      { type: "paragraph", text: "Hallo." },
      { type: "bullet", text: "Punkt" },
      { type: "numbered", n: 1, text: "Eins" },
      { type: "heading", text: "Titel" },
    ]);
  });
});

describe("letterFilename", () => {
  it("bereinigt den Titel", () => {
    expect(letterFilename("Mahnung / GmbH", "pdf")).toBe("Mahnung-GmbH.pdf");
  });
});
