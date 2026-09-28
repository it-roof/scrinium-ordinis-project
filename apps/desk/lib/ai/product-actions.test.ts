import { describe, expect, it } from "vitest";

import {
  PRODUCT_ACTIONS,
  productBadgesForChat,
} from "@/lib/ai/product-actions";

describe("productBadgesForChat", () => {
  it("Freier Chat v1: keine Badges", () => {
    expect(productBadgesForChat("free")).toEqual([]);
  });

  it("Akten-Chat v1: Prompt- und Funktions-Badges", () => {
    const badges = productBadgesForChat("matter");
    expect(badges.map((b) => b.id)).toEqual([
      "analyze-case-facts",
      "counter-review",
      "create-letter",
      "create-email-text",
      "send-email",
      "open-save-letter",
      "print-download",
    ]);
    expect(badges.some((b) => b.kind === "prompt")).toBe(true);
    expect(badges.some((b) => b.kind === "function")).toBe(true);
  });

  it("Vertrag analysieren ist nicht im Katalog", () => {
    expect(PRODUCT_ACTIONS.some((a) => a.id.includes("contract"))).toBe(
      false
    );
  });
});
