import { describe, expect, it } from "vitest";

import {
  formatMatterDate,
  groupMattersByClient,
  sortMatters,
} from "@/lib/matters/gallery";

const items = [
  {
    id: "a",
    title: "Zebra",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
  },
  {
    id: "b",
    title: "Alba",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-10T10:00:00.000Z",
  },
];

describe("sortMatters", () => {
  it("sortiert nach letzter Änderung", () => {
    expect(sortMatters(items, "updated").map((item) => item.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("sortiert nach Anlage", () => {
    expect(sortMatters(items, "created").map((item) => item.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("sortiert alphabetisch", () => {
    expect(sortMatters(items, "alpha").map((item) => item.id)).toEqual([
      "b",
      "a",
    ]);
  });
});

describe("groupMattersByClient", () => {
  it("ordnet Akten dem Mandanten zu", () => {
    const grouped = groupMattersByClient(
      [
        {
          id: "1",
          title: "Werklohn",
          clientId: "c1",
          clientName: "Müller GmbH",
          createdAt: "2026-10-01T10:00:00.000Z",
          updatedAt: "2026-10-20T10:00:00.000Z",
        },
        {
          id: "2",
          title: "Nachtrag",
          clientId: "c1",
          clientName: "Müller GmbH",
          createdAt: "2026-10-02T10:00:00.000Z",
          updatedAt: "2026-10-18T10:00:00.000Z",
        },
        {
          id: "3",
          title: "Miete",
          clientId: "c2",
          clientName: "Alba KG",
          createdAt: "2026-10-03T10:00:00.000Z",
          updatedAt: "2026-10-19T10:00:00.000Z",
        },
      ],
      "updated"
    );

    expect(grouped.map((group) => group.clientName)).toEqual([
      "Müller GmbH",
      "Alba KG",
    ]);
    expect(grouped[0]?.matters.map((matter) => matter.id)).toEqual(["1", "2"]);
    expect(grouped[1]?.matters.map((matter) => matter.id)).toEqual(["3"]);
  });
});

describe("formatMatterDate", () => {
  const now = new Date(2026, 9, 29, 12).getTime();

  it("benennt heute, gestern und relative Tage", () => {
    expect(formatMatterDate(new Date(2026, 9, 29, 8).toISOString(), now)).toBe(
      "Heute"
    );
    expect(formatMatterDate(new Date(2026, 9, 28, 8).toISOString(), now)).toBe(
      "Gestern"
    );
    expect(formatMatterDate(new Date(2026, 9, 26, 8).toISOString(), now)).toBe(
      "vor 3 Tagen"
    );
  });
});
