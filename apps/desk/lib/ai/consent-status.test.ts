import { describe, expect, it } from "vitest";

import {
  consentStatusView,
  isAiConsentGranted,
} from "./consent-status";

describe("consentStatusView", () => {
  it("returns none when no consent row exists", () => {
    expect(consentStatusView(null)).toBe("none");
  });

  it("returns granted for status granted", () => {
    expect(consentStatusView({ status: "granted" })).toBe("granted");
  });

  it("returns revoked for status revoked", () => {
    expect(consentStatusView({ status: "revoked" })).toBe("revoked");
  });
});

describe("isAiConsentGranted", () => {
  it("allows only granted", () => {
    expect(isAiConsentGranted(null)).toBe(false);
    expect(isAiConsentGranted({ status: "revoked" })).toBe(false);
    expect(isAiConsentGranted({ status: "granted" })).toBe(true);
  });
});
