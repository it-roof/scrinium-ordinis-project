import { describe, expect, it } from "vitest";

import {
  applyManualMarks,
  pseudonymize,
  repersonalize,
  type KnownEntity,
} from "./pseudonymize";

describe("pseudonymize", () => {
  it("replaces known entities with stable placeholders (Küchen case)", () => {
    const entities: KnownEntity[] = [
      { type: "PERSON", value: "Max Mustermann" },
      { type: "FIRMA", value: "Küchen Huber GmbH" },
      { type: "FIRMA", value: "Huber" },
    ];
    const input =
      "Max Mustermann bestellte bei Küchen Huber GmbH. Huber meldet sich nicht.";
    const { text } = pseudonymize(input, entities);
    expect(text).toBe(
      "[PERSON_1] bestellte bei [FIRMA_1]. [FIRMA_2] meldet sich nicht."
    );
  });

  it("pseudonymizes Dachbau / Lindner case entities", () => {
    const entities: KnownEntity[] = [
      { type: "PERSON", value: "Frau Lindner" },
      { type: "PERSON", value: "Lindner" },
      { type: "FIRMA", value: "Dachbau Krüger GmbH" },
      { type: "FIRMA", value: "Krüger" },
    ];
    const input =
      "Frau Lindner beauftragte die Dachbau Krüger GmbH. Lindner behielt Geld ein; Krüger verlangt Nachzahlung.";
    const { text, mapping } = pseudonymize(input, entities);
    expect(text).not.toMatch(/Lindner/i);
    expect(text).not.toMatch(/Krüger/i);
    expect(text).toContain("[PERSON_");
    expect(text).toContain("[FIRMA_");
    const { text: back } = repersonalize(text, mapping);
    expect(back).toMatch(/Lindner/);
    expect(back).toMatch(/Krüger|Dachbau/);
  });

  it("detects IBAN, email, phone and court file numbers", () => {
    const input =
      "IBAN DE89 3704 0044 0532 0130 00, mail test@example.com, Tel +49 175 1234567, Az 12 O 345/25.";
    const { text, mapping } = pseudonymize(input, []);
    expect(text).toContain("[IBAN_1]");
    expect(text).toContain("[EMAIL_1]");
    expect(text).toContain("[PHONE_1]");
    expect(text).toContain("[AZ_1]");
    expect(mapping.size).toBe(4);
  });

  it("repersonalizes using first occurrence spelling", () => {
    const entities: KnownEntity[] = [
      { type: "PERSON", value: "Max Mustermann" },
    ];
    const { text, mapping } = pseudonymize(
      "Max Mustermann und max mustermann.",
      entities
    );
    expect(text).toBe("[PERSON_1] und [PERSON_1].");
    const { text: back } = repersonalize(text, mapping);
    expect(back).toBe("Max Mustermann und Max Mustermann.");
  });

  it("reports unknown placeholders in the response", () => {
    const mapping = new Map<string, string>([
      ["[PERSON_1]", "Max Mustermann"],
    ]);
    const { text, unknownPlaceholders } = repersonalize(
      "[PERSON_1] vs [PERSON_9]",
      mapping
    );
    expect(text).toBe("Max Mustermann vs [PERSON_9]");
    expect(unknownPlaceholders).toEqual(["[PERSON_9]"]);
  });

  it("does not count entities that do not appear in the text", () => {
    const entities: KnownEntity[] = [
      { type: "PERSON", value: "Max Mustermann" },
      { type: "FIRMA", value: "Küchen Huber GmbH" },
    ];
    const { text, placeholderCount } = pseudonymize(
      "Franz Markus schuldet mir 2000 EUR der Bayern Bau",
      entities
    );
    expect(text).toBe("Franz Markus schuldet mir 2000 EUR der Bayern Bau");
    expect(placeholderCount).toBe(0);
  });

  it("applies manual OTHER marks from preview", () => {
    const { text, mapping } = pseudonymize("Alpha und Beta.", [
      { type: "PERSON", value: "Alpha" },
    ]);
    expect(text).toBe("[PERSON_1] und Beta.");
    const marked = applyManualMarks(text, ["Beta"], mapping);
    expect(marked.text).toBe("[PERSON_1] und [OTHER_1].");
    expect(marked.mapping.get("[OTHER_1]")).toBe("Beta");
  });
});
