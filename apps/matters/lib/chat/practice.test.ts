import { describe, expect, it } from "vitest";

import { practiceForDeskRole } from "./practice";

describe("practiceForDeskRole", () => {
  it("maps tax roles to tax", () => {
    expect(practiceForDeskRole("steuerberater")).toBe("tax");
    expect(practiceForDeskRole("stb_sekretariat")).toBe("tax");
  });

  it("maps legal roles and empty to legal", () => {
    expect(practiceForDeskRole("rechtsanwalt")).toBe("legal");
    expect(practiceForDeskRole("sekretariat")).toBe("legal");
    expect(practiceForDeskRole(null)).toBe("legal");
  });
});
