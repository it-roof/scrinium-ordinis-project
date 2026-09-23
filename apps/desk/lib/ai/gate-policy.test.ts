import { describe, expect, it, afterEach } from "vitest";

import { getPseudonymGatePolicy } from "@/lib/ai/gate-policy";

describe("getPseudonymGatePolicy", () => {
  const prev = process.env.AI_PSEUDONYM_GATE;

  afterEach(() => {
    if (prev === undefined) delete process.env.AI_PSEUDONYM_GATE;
    else process.env.AI_PSEUDONYM_GATE = prev;
  });

  it("defaults to block", () => {
    delete process.env.AI_PSEUDONYM_GATE;
    expect(getPseudonymGatePolicy()).toBe("block");
  });

  it("accepts warn", () => {
    expect(getPseudonymGatePolicy({ AI_PSEUDONYM_GATE: "warn" })).toBe("warn");
  });
});
