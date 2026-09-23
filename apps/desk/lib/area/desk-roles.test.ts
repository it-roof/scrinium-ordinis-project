import { describe, expect, it } from "vitest";

import {
  DESK_ROLE_BUNDLES,
  functionsForDeskRoles,
  practicesForDeskRoles,
  resolveEffectiveAllowedFunctions,
  resolveEffectivePractices,
} from "./desk-roles";

describe("DESK_ROLE_BUNDLES", () => {
  it("gibt RA Prompt und Analyse, Sekretär nicht", () => {
    expect(DESK_ROLE_BUNDLES.rechtsanwalt.functions).toContain("prompts");
    expect(DESK_ROLE_BUNDLES.rechtsanwalt.functions).toContain("letters");
    expect(DESK_ROLE_BUNDLES.rechtsanwalt.functions).toContain(
      "case-facts-analysis"
    );
    expect(DESK_ROLE_BUNDLES.rechtsanwalt.functions).toContain("ai-chat");
    expect(DESK_ROLE_BUNDLES.rechtsanwalt.functions).toContain(
      "contract-analysis"
    );
    expect(DESK_ROLE_BUNDLES.rechtsanwalt.functions).toContain("client-intake");
    expect(DESK_ROLE_BUNDLES.sekretariat.functions).toContain("client-intake");
    expect(DESK_ROLE_BUNDLES.sekretariat.functions).not.toContain("prompts");
    expect(DESK_ROLE_BUNDLES.sekretariat.functions).toContain("letters");
    expect(DESK_ROLE_BUNDLES.sekretariat.functions).not.toContain(
      "case-facts-analysis"
    );
    expect(DESK_ROLE_BUNDLES.sekretariat.functions).not.toContain("ai-chat");
    expect(DESK_ROLE_BUNDLES.sekretariat.functions).not.toContain(
      "contract-analysis"
    );
  });

  it("teilt legal Practice für RA und RA-Sekretär", () => {
    expect(DESK_ROLE_BUNDLES.rechtsanwalt.practices).toEqual(["legal"]);
    expect(DESK_ROLE_BUNDLES.sekretariat.practices).toEqual(["legal"]);
  });

  it("bindet StB an tax", () => {
    expect(DESK_ROLE_BUNDLES.steuerberater.practices).toEqual(["tax"]);
    expect(DESK_ROLE_BUNDLES.stb_sekretariat.practices).toEqual(["tax"]);
    expect(DESK_ROLE_BUNDLES.steuerberater.functions).not.toContain("prompts");
  });
});

describe("functionsForDeskRoles / practicesForDeskRoles", () => {
  it("bildet Union bei Multi-Rolle", () => {
    const functions = functionsForDeskRoles([
      "rechtsanwalt",
      "steuerberater",
    ]);
    expect(functions).toContain("prompts");
    expect(functions).toContain("docs");
    expect(practicesForDeskRoles(["rechtsanwalt", "steuerberater"])).toEqual(
      expect.arrayContaining(["legal", "tax"])
    );
  });
});

describe("resolveEffectiveAllowedFunctions", () => {
  it("schneidet Rolle mit Allowlist", () => {
    const result = resolveEffectiveAllowedFunctions({
      deskRole: "rechtsanwalt",
      allowedFunctions: ["prompts", "notes"],
    });
    expect(result).toEqual(["prompts", "notes"]);
  });

  it("Sekretär behält kein Prompt auch mit leerer Schnittmenge aus Bundle", () => {
    const result = resolveEffectiveAllowedFunctions({
      deskRole: "sekretariat",
      allowedFunctions: null,
    });
    expect(result).not.toContain("prompts");
    expect(result).toContain("clients");
  });
});

describe("resolveEffectivePractices", () => {
  it("schneidet Rollen-Practices mit Tenant", () => {
    expect(
      resolveEffectivePractices({
        tenantPractices: ["legal", "tax"],
        deskRole: "rechtsanwalt",
      })
    ).toEqual(["legal"]);
  });

  it("ohne Rolle: alle Tenant-Practices", () => {
    expect(
      resolveEffectivePractices({
        tenantPractices: ["legal", "tax"],
        deskRole: null,
      })
    ).toEqual(["legal", "tax"]);
  });

  it("Multi-Rolle: Union ∩ Tenant", () => {
    expect(
      resolveEffectivePractices({
        tenantPractices: ["legal", "tax"],
        deskRoles: ["rechtsanwalt", "steuerberater"],
      })
    ).toEqual(expect.arrayContaining(["legal", "tax"]));
  });
});
