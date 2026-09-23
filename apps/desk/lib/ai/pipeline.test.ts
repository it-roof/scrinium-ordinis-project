import { describe, expect, it } from "vitest";

import { detectLocalEntities, findResidualSpans } from "@/lib/ai/ner-local";
import {
  assertResidualsCleared,
  runPseudonymPipeline,
} from "@/lib/ai/pipeline";
import type { KnownEntity } from "@/lib/ai/pseudonymize";

describe("detectLocalEntities", () => {
  it("finds Franz Markus and Bayern Bau", () => {
    const input = "Franz Markus schuldet mir 2000 EUR der Bayern Bau";
    const entities = detectLocalEntities(input);
    const values = entities.map((e) => e.value);
    expect(values.some((v) => /Franz Markus/i.test(v))).toBe(true);
    expect(values.some((v) => /Bayern Bau/i.test(v))).toBe(true);
  });
});

describe("runPseudonymPipeline", () => {
  it("pseudonymizes unknown names via Stufe 2 without DB parties", () => {
    const known: KnownEntity[] = [];
    const { text, placeholderCount, nerEntities, residuals } =
      runPseudonymPipeline(
        "Franz Markus schuldet mir 2000 EUR der Bayern Bau",
        known,
        { env: { AI_PSEUDONYM_GATE: "block" } }
      );
    expect(nerEntities.length).toBeGreaterThan(0);
    expect(text).toMatch(/\[PERSON_/);
    expect(text).toMatch(/\[FIRMA_/);
    expect(text).not.toMatch(/Franz Markus/);
    expect(text).not.toMatch(/Bayern Bau/);
    expect(placeholderCount).toBeGreaterThan(0);
    expect(residuals.length).toBe(0);
  });

  it("assertResidualsCleared respects block vs warn", () => {
    expect(assertResidualsCleared(["Mustermann"], "block").ok).toBe(false);
    expect(assertResidualsCleared([], "block").ok).toBe(true);
    expect(assertResidualsCleared(["x"], "warn").ok).toBe(true);
  });

  it("dismissed residuals clear the gate list", () => {
    expect(findResidualSpans("Franz Markus bleibt")).toContain("Franz Markus");
    const pipeline = runPseudonymPipeline("Franz Markus bleibt", [], {
      dismissedResiduals: ["Franz Markus"],
      env: { AI_PSEUDONYM_GATE: "block" },
    });
    // NER may replace Franz Markus entirely; if not, dismiss must clear
    expect(
      assertResidualsCleared(pipeline.residuals, pipeline.gatePolicy).ok
    ).toBe(true);
  });

  it("ignores invented dismissals that are not detected residuals", () => {
    const pipeline = runPseudonymPipeline("Mustermann klagt", [], {
      dismissedResiduals: ["TotallyFakeNameXYZ"],
      env: { AI_PSEUDONYM_GATE: "block" },
    });
    expect(pipeline.appliedDismissals).toEqual([]);
    expect(pipeline.residuals.length).toBeGreaterThan(0);
    expect(
      assertResidualsCleared(pipeline.residuals, pipeline.gatePolicy).ok
    ).toBe(false);
  });

  it("blocks single-token residual surnames under gate=block", () => {
    const residuals = findResidualSpans("Mustermann erscheint nicht");
    expect(residuals.some((r) => /Mustermann/i.test(r))).toBe(true);
    expect(assertResidualsCleared(residuals, "block").ok).toBe(false);
  });

  it("returns only sanitized marks that appear in text", () => {
    // Lowercase neighbors → single-token Mustermann is not auto-NER'd
    const pipeline = runPseudonymPipeline(
      "der zeuge Mustermann erschien.",
      [],
      {
        manualMarks: ["Mustermann", "NotInText"],
        env: { AI_PSEUDONYM_GATE: "block" },
      }
    );
    expect(pipeline.appliedMarks).toEqual(["Mustermann"]);
    expect(pipeline.text).toMatch(/\[OTHER_/);
    expect(pipeline.text).not.toMatch(/Mustermann/);
  });
});
