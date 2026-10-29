import { describe, expect, it } from "vitest";

import {
  PRODUCT_ACTIONS,
  productBadgesForChat,
} from "@/lib/ai/product-actions";

describe("productBadgesForChat", () => {
  it("Akten-Chat: nur Start-Prompt-Badges", () => {
    const badges = productBadgesForChat("matter");
    expect(badges.map((b) => b.id)).toEqual([
      "analyze-case-facts",
      "counter-review",
      "create-letter",
      "create-email-text",
    ]);
    expect(badges.every((b) => b.kind === "prompt")).toBe(true);
  });

  it("Abschluss-Aktionen sind Katalog, aber kein Badge", () => {
    for (const id of ["send-email", "open-save-letter", "print-download"]) {
      const action = PRODUCT_ACTIONS.find((a) => a.id === id);
      expect(action).toBeDefined();
      expect(action?.badgeV1).toBe(false);
    }
  });

  it("Vertrag analysieren ist nicht im Katalog", () => {
    expect(PRODUCT_ACTIONS.some((a) => a.id.includes("contract"))).toBe(
      false
    );
  });
});
