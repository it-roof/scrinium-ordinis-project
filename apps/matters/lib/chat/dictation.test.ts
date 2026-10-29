import { describe, expect, it } from "vitest";

import { appendDictation } from "@/lib/chat/dictation";

describe("appendDictation", () => {
  it("setzt den ersten Satz", () => {
    expect(appendDictation("", "Kündigung zum 31.12.")).toBe(
      "Kündigung zum 31.12."
    );
  });

  it("hängt mit Leerzeichen an", () => {
    expect(appendDictation("Sachverhalt:", "Mandant wurde abgemahnt.")).toBe(
      "Sachverhalt: Mandant wurde abgemahnt."
    );
  });

  it("ignoriert leere Transkripte", () => {
    expect(appendDictation("Bestehender Text", "  ")).toBe("Bestehender Text");
  });
});
