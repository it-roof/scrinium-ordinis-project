import { describe, expect, it } from "vitest";

import {
  matchExistingClient,
  parseIntakeJson,
} from "@/lib/matters/intake";

describe("parseIntakeJson", () => {
  it("liest Mandant und Akte aus JSON", () => {
    const draft = parseIntakeJson(`
      Hier der Auszug:
      \`\`\`json
      {
        "client": {
          "kind": "company",
          "name": "Müller GmbH",
          "street": "Markt 1",
          "postalCode": "90402",
          "city": "Nürnberg"
        },
        "opponentName": "Bau Nord AG",
        "subject": "Werklohn",
        "title": "Werklohnforderung Baustelle Nord",
        "courtName": "LG Nürnberg-Fürth"
      }
      \`\`\`
    `);
    expect(draft.clientName).toBe("Müller GmbH");
    expect(draft.opponentName).toBe("Bau Nord AG");
    expect(draft.subject).toBe("Werklohn");
    expect(draft.courtName).toBe("LG Nürnberg-Fürth");
  });

  it("liefert leer bei unsinnigem Text", () => {
    expect(parseIntakeJson("kein json").clientName).toBe("");
  });

  it("setzt Personennamen aus Vor- und Nachname", () => {
    const draft = parseIntakeJson(
      '{"client":{"firstName":"Anna","lastName":"Meier"}}'
    );
    expect(draft.clientName).toBe("Anna Meier");
    expect(draft.clientKind).toBe("person");
  });
});

describe("matchExistingClient", () => {
  it("ordnet ähnlichen Mandantennamen zu", () => {
    const matched = matchExistingClient(
      {
        ...parseIntakeJson('{"client":{"name":"Mueller GmbH"}}'),
      },
      [
        {
          id: "c1",
          name: "Müller GmbH",
          kind: "company",
          firstName: "",
          lastName: "",
          street: "Markt 1",
          postalCode: "90402",
          city: "Nürnberg",
        },
      ]
    );
    expect(matched.clientId).toBe("c1");
    expect(matched.clientCity).toBe("Nürnberg");
  });
});
