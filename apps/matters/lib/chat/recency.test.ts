import { describe, expect, it } from "vitest";

import { recencyGroup } from "@/lib/chat/recency";

describe("recencyGroup", () => {
  const now = new Date("2026-10-27T15:00:00.000Z").getTime();

  it("ordnet heute / gestern / woche / älter", () => {
    expect(recencyGroup("2026-10-27T09:00:00.000Z", now)).toBe("today");
    expect(recencyGroup("2026-10-26T18:00:00.000Z", now)).toBe("yesterday");
    expect(recencyGroup("2026-10-22T12:00:00.000Z", now)).toBe("week");
    expect(recencyGroup("2026-09-01T12:00:00.000Z", now)).toBe("older");
  });
});
