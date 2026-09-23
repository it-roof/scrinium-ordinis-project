import { describe, expect, it, afterEach } from "vitest";

import { isAiDebugEnabled } from "@/lib/ai/debug";

describe("isAiDebugEnabled", () => {
  const prev = process.env.AI_DEBUG;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.AI_DEBUG;
    } else {
      process.env.AI_DEBUG = prev;
    }
  });

  it("is false when unset", () => {
    delete process.env.AI_DEBUG;
    expect(isAiDebugEnabled()).toBe(false);
  });

  it("is true for 1 / true / yes", () => {
    process.env.AI_DEBUG = "1";
    expect(isAiDebugEnabled()).toBe(true);
    process.env.AI_DEBUG = "true";
    expect(isAiDebugEnabled()).toBe(true);
    process.env.AI_DEBUG = "yes";
    expect(isAiDebugEnabled()).toBe(true);
  });

  it("is false for other values", () => {
    process.env.AI_DEBUG = "0";
    expect(isAiDebugEnabled()).toBe(false);
    process.env.AI_DEBUG = "false";
    expect(isAiDebugEnabled()).toBe(false);
  });
});
