import { describe, expect, it } from "vitest";

import {
  findCollisionMatches,
  namesSimilar,
  normalizePartyName,
} from "@/lib/matters/collision";
import { suggestShortTitle } from "@/lib/matters/title";

describe("normalizePartyName", () => {
  it("normalisiert Großschreibung, Umlaute und Satzzeichen", () => {
    expect(normalizePartyName("Müller GmbH.")).toBe("mueller gmbh");
    expect(normalizePartyName("  Straße  ")).toBe("strasse");
  });
});

describe("namesSimilar", () => {
  it("erkennt denselben Namen", () => {
    expect(namesSimilar("Müller GmbH", "Mueller GmbH")).toBe(true);
  });

  it("erkennt enthaltene Namen ab 4 Zeichen", () => {
    expect(namesSimilar("Alba KG", "Alba")).toBe(true);
  });

  it("verwirft kurze Zufallstreffer", () => {
    expect(namesSimilar("AG", "AG")).toBe(true);
    expect(namesSimilar("xy", "xy GmbH")).toBe(false);
  });
});

describe("findCollisionMatches", () => {
  const others = [
    {
      id: "m1",
      title: "Weber ./. Alba",
      fileNumber: "3/2026",
      names: [
        { role: "client" as const, name: "Weber GmbH" },
        { role: "opponent" as const, name: "Alba KG" },
      ],
    },
  ];

  it("warnt wenn neuer Mandant woanders Gegner ist", () => {
    const matches = findCollisionMatches(
      [{ role: "client", name: "Alba KG" }],
      others
    );
    expect(matches).toEqual([
      {
        matterId: "m1",
        matterTitle: "Weber ./. Alba",
        fileNumber: "3/2026",
        role: "opponent",
        name: "Alba KG",
      },
    ]);
  });

  it("warnt wenn neuer Gegner woanders Mandant ist", () => {
    const matches = findCollisionMatches(
      [{ role: "opponent", name: "Weber GmbH" }],
      others
    );
    expect(matches.map((item) => item.role)).toEqual(["client"]);
  });

  it("ignoriert denselben Mandanten in zwei Akten", () => {
    expect(
      findCollisionMatches([{ role: "client", name: "Weber GmbH" }], others)
    ).toEqual([]);
  });
});

describe("suggestShortTitle", () => {
  it("setzt Mandant ./. Gegner", () => {
    expect(suggestShortTitle("Weber GmbH", "Alba KG")).toBe(
      "Weber GmbH ./. Alba KG"
    );
  });
});
