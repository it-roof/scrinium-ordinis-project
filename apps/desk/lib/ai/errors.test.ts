import { describe, expect, it } from "vitest";

import { AI_ERROR, userMessageForAiError } from "./errors";

describe("userMessageForAiError", () => {
  it("maps known codes to German UI messages", () => {
    expect(userMessageForAiError(AI_ERROR.NO_CONSENT)).toMatch(/Einwilligung/);
    expect(userMessageForAiError(AI_ERROR.FORBIDDEN)).toMatch(/erlaubt/i);
    expect(userMessageForAiError(AI_ERROR.AI_ACCESS_DENIED)).toMatch(/AWS/);
    expect(userMessageForAiError(AI_ERROR.AI_ERROR)).toMatch(/fehlgeschlagen/i);
  });
});
