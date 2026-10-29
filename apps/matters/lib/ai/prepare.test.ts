import { describe, expect, it } from "vitest";

import { prepareBedrockMessages } from "./prepare";

describe("prepareBedrockMessages", () => {
  it("pseudonymizes emails and keeps a mapping", () => {
    const { messages, mapping } = prepareBedrockMessages([
      { role: "user", content: "Bitte an max@kanzlei.de schreiben." },
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toContain("[EMAIL_1]");
    expect(messages[0]?.content).not.toContain("max@kanzlei.de");
    expect(mapping.get("[EMAIL_1]")).toBe("max@kanzlei.de");
  });

  it("merges consecutive same-role turns", () => {
    const { messages } = prepareBedrockMessages([
      { role: "user", content: "Eins" },
      { role: "user", content: "Zwei" },
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toBe("Eins\n\nZwei");
  });

  it("drops empty turns", () => {
    const { messages } = prepareBedrockMessages([
      { role: "user", content: "   " },
      { role: "user", content: "Hallo" },
    ]);

    expect(messages).toEqual([{ role: "user", content: "Hallo" }]);
  });
});
