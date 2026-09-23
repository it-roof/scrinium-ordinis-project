import { describe, expect, it } from "vitest";

import {
  isEuAwsRegion,
  isEuBedrockModelId,
  requireEuAwsRegion,
  requireEuBedrockModelId,
} from "./model-id";

describe("Bedrock EU model id", () => {
  it("accepts eu. prefix", () => {
    expect(isEuBedrockModelId("eu.anthropic.claude-sonnet-4-6")).toBe(true);
    expect(
      requireEuBedrockModelId("eu.anthropic.claude-sonnet-4-6")
    ).toBe("eu.anthropic.claude-sonnet-4-6");
  });

  it("rejects us. and global. profiles", () => {
    expect(isEuBedrockModelId("us.anthropic.claude-sonnet-4-6")).toBe(false);
    expect(isEuBedrockModelId("global.anthropic.claude-sonnet-4-6")).toBe(
      false
    );
    expect(() =>
      requireEuBedrockModelId("us.anthropic.claude-sonnet-4-6")
    ).toThrow(/eu\./);
  });
});

describe("AWS EU region", () => {
  it("accepts eu-* regions", () => {
    expect(isEuAwsRegion("eu-central-1")).toBe(true);
    expect(requireEuAwsRegion("eu-west-1")).toBe("eu-west-1");
  });

  it("rejects non-EU regions", () => {
    expect(isEuAwsRegion("us-east-1")).toBe(false);
    expect(isEuAwsRegion("ap-southeast-1")).toBe(false);
    expect(() => requireEuAwsRegion("us-east-1")).toThrow(/eu-\*/);
  });
});
