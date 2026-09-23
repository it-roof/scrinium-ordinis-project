import { describe, expect, it } from "vitest";

import { detectLocalEntities, findResidualSpans } from "@/lib/ai/ner-local";

describe("ner-local", () => {
  it("detects person and firm from free text", () => {
    const entities = detectLocalEntities(
      "Franz Markus schuldet mir 2000 EUR der Bayern Bau"
    );
    expect(entities.some((e) => e.value === "Franz Markus")).toBe(true);
    expect(entities.some((e) => e.value === "Bayern Bau")).toBe(true);
  });

  it("finds residuals in uncleaned text", () => {
    expect(findResidualSpans("Franz Markus bleibt")).toContain("Franz Markus");
  });

  it("ignores placeholders", () => {
    expect(findResidualSpans("[PERSON_1] schuldet [FIRMA_1]")).toEqual([]);
  });
});
