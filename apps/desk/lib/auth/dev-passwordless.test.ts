import { afterEach, describe, expect, it } from "vitest";

import { isDevPasswordlessLoginEnabled } from "@/lib/auth/dev-passwordless";

describe("isDevPasswordlessLoginEnabled", () => {
  const prevFlag = process.env.AUTH_DEV_PASSWORDLESS;
  const prevNode = process.env.NODE_ENV;

  afterEach(() => {
    if (prevFlag === undefined) {
      delete process.env.AUTH_DEV_PASSWORDLESS;
    } else {
      process.env.AUTH_DEV_PASSWORDLESS = prevFlag;
    }
    process.env.NODE_ENV = prevNode;
  });

  it("is false in production even when flag is true", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_DEV_PASSWORDLESS = "true";
    expect(isDevPasswordlessLoginEnabled()).toBe(false);
  });

  it("is true in development when flag is true", () => {
    process.env.NODE_ENV = "development";
    process.env.AUTH_DEV_PASSWORDLESS = "true";
    expect(isDevPasswordlessLoginEnabled()).toBe(true);
  });

  it("is false when flag unset", () => {
    process.env.NODE_ENV = "development";
    delete process.env.AUTH_DEV_PASSWORDLESS;
    expect(isDevPasswordlessLoginEnabled()).toBe(false);
  });
});
