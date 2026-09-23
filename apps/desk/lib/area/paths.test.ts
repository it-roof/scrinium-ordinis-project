import { describe, expect, it } from "vitest";

import {
  DESK_SCOPED_FLAT_SEGMENTS,
  hrefFor,
  practiceFromSlug,
  slugForPractice,
} from "@/lib/area/paths";

describe("hrefFor", () => {
  it("liefert flache URLs für persönliche/shared Funktionen", () => {
    expect(hrefFor("prompts")).toBe("/prompt");
    expect(hrefFor("notes")).toBe("/notizen");
    expect(hrefFor("ai-chat")).toBe("/ki");
    expect(hrefFor("contract-analysis")).toBe("/vertragsanalyse");
    expect(hrefFor("client-intake")).toBe("/aufnahmebogen");
    expect(hrefFor("inbox")).toBe("/eingang");
    expect(hrefFor("inbox-sent")).toBe("/gesendet");
    expect(hrefFor("staff-messages")).toBe("/zuweisen");
  });

  it("liefert Practice-URLs für bereichsgebundene Funktionen", () => {
    expect(hrefFor("clients", "legal")).toBe("/r/mandanten");
    expect(hrefFor("matters", "tax")).toBe("/s/akten");
    expect(hrefFor("text-blocks", "legal")).toBe("/r/textbausteine");
    expect(hrefFor("case-facts-analysis", "legal")).toBe("/r/analyse");
    expect(hrefFor("docs", "tax")).toBe("/s/dokumentation");
    expect(hrefFor("templates", "tax")).toBe("/s/vorlagen");
    expect(hrefFor("letters", "legal")).toBe("/r/schreiben");
  });

  it("wirft ohne Practice bei scoped Funktionen", () => {
    expect(() => hrefFor("clients")).toThrow(/Practice/);
  });
});

describe("Practice-Slugs", () => {
  it("kennt nur kanonische Slugs", () => {
    expect(slugForPractice("legal")).toBe("r");
    expect(slugForPractice("tax")).toBe("s");
    expect(slugForPractice("notary")).toBe("n");
    expect(slugForPractice("administration")).toBe("verwaltung");
    expect(practiceFromSlug("r")).toBe("legal");
    expect(practiceFromSlug("s")).toBe("tax");
    expect(practiceFromSlug("n")).toBe("notary");
    expect(practiceFromSlug("verwaltung")).toBe("administration");
    expect(practiceFromSlug("recht")).toBeNull();
    expect(practiceFromSlug("steuer")).toBeNull();
    expect(practiceFromSlug("notariat")).toBeNull();
  });
});

describe("DESK_SCOPED_FLAT_SEGMENTS", () => {
  it("enthält alle bereichsgebundenen Flat-Segmente", () => {
    expect(DESK_SCOPED_FLAT_SEGMENTS).toEqual(
      expect.arrayContaining([
        "mandanten",
        "akten",
        "textbausteine",
        "analyse",
        "dokumentation",
        "vorlagen",
        "schreiben",
      ])
    );
  });
});
