import { describe, expect, it } from "vitest";

import { filterChats, filterMatters } from "@/lib/chat/search";

describe("filterChats", () => {
  const chats = [
    { id: "1", title: "Mietrecht Kündigung" },
    { id: "2", title: "Arbeitsvertrag prüfen" },
    { id: "3", title: "Kündigungsschutzklage" },
  ];

  it("gibt alle zurück ohne Query", () => {
    expect(filterChats(chats, "  ")).toEqual(chats);
  });

  it("findet Teiltreffer unabhängig von Großschreibung", () => {
    expect(filterChats(chats, "künd").map((chat) => chat.id)).toEqual([
      "1",
      "3",
    ]);
  });

  it("liefert leer wenn nichts passt", () => {
    expect(filterChats(chats, "Steuer")).toEqual([]);
  });
});

describe("filterMatters", () => {
  const matters = [
    {
      id: "1",
      title: "Kündigung",
      reference: "",
      fileNumber: "12/2026",
      subject: "Kündigungsschutz",
      clientName: "Müller GmbH",
    },
    {
      id: "2",
      title: "Gesellschaftsvertrag",
      reference: "",
      fileNumber: "1/2026",
      subject: "",
      clientName: "Alba KG",
    },
  ];

  it("findet Akte über Mandant, Aktennummer oder Gegenstand", () => {
    expect(filterMatters(matters, "müller").map((item) => item.id)).toEqual(["1"]);
    expect(filterMatters(matters, "12/2026").map((item) => item.id)).toEqual(["1"]);
    expect(filterMatters(matters, "kündigungsschutz").map((item) => item.id)).toEqual([
      "1",
    ]);
    expect(filterMatters(matters, "gesellschaft").map((item) => item.id)).toEqual([
      "2",
    ]);
  });
});
