import { describe, expect, it } from "vitest";

import {
  normalizeContractWorkspaceMessages,
  AI_CONTRACT_WORKSPACE_MESSAGE_MAX_CHARS,
} from "./session";
import { writeContractDocx } from "./write-docx";

describe("normalizeContractWorkspaceMessages", () => {
  it("hängt User-Nachricht an und startet mit user", () => {
    const result = normalizeContractWorkspaceMessages(
      [{ role: "assistant", content: "Hallo" }],
      "Frage"
    );
    expect(result).toEqual([{ role: "user", content: "Frage" }]);
  });

  it("merged gleiche Rollen und begrenzt Länge", () => {
    const result = normalizeContractWorkspaceMessages(
      [
        { role: "user", content: "A" },
        { role: "assistant", content: "B" },
      ],
      "C"
    );
    expect(result).toEqual([
      { role: "user", content: "A" },
      { role: "assistant", content: "B" },
      { role: "user", content: "C" },
    ]);
  });

  it("lehnt leere oder zu lange Nachrichten ab", () => {
    expect(normalizeContractWorkspaceMessages([], "  ")).toBeNull();
    expect(
      normalizeContractWorkspaceMessages(
        [],
        "x".repeat(AI_CONTRACT_WORKSPACE_MESSAGE_MAX_CHARS + 1)
      )
    ).toBeNull();
  });
});

describe("writeContractDocx", () => {
  it("erzeugt DOCX aus Titel und Absätzen", async () => {
    const result = await writeContractDocx({
      title: "Mietvertrag Entwurf",
      body: "## § 1 Gegenstand\n\nDie Parteien vereinbaren Folgendes.\n\n## § 2 Laufzeit\n\nDer Vertrag beginnt am …",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.filename).toMatch(/\.docx$/);
    expect(result.buffer.byteLength).toBeGreaterThan(1000);
  });

  it("lehnt leeren Body ab", async () => {
    const result = await writeContractDocx({ title: "X", body: "  " });
    expect(result.ok).toBe(false);
  });
});
