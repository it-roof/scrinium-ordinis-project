import { describe, expect, it } from "vitest";

import { parseCreateLetterOutput } from "@/lib/letters/parse";

describe("parseCreateLetterOutput", () => {
  it("parst strukturierte Ausgabe", () => {
    const parsed = parseCreateLetterOutput(`TITEL: Mahnung
ANREDE: Sehr geehrte Damen und Herren,
TEXT:
hiermit mahnen wir.

Bitte zahlen Sie {{Betrag}}.
SCHLUSS: Mit freundlichen Grüßen`);
    expect(parsed.title).toBe("Mahnung");
    expect(parsed.salutation).toContain("Sehr geehrte");
    expect(parsed.body).toContain("mahnen");
    expect(parsed.body).toContain("{{Betrag}}");
    expect(parsed.closing).toContain("Mit freundlichen");
  });

  it("fällt auf Rohtext zurück", () => {
    const parsed = parseCreateLetterOutput("Nur Freitext ohne Marker.");
    expect(parsed.title).toBe("Schreiben");
    expect(parsed.body).toContain("Nur Freitext");
  });
});
