/**
 * Pure Bedrock model-id / region checks — fail-closed on non-EU.
 */

export function isEuBedrockModelId(modelId: string): boolean {
  return modelId.trim().startsWith("eu.");
}

export function requireEuBedrockModelId(modelId: string): string {
  const trimmed = modelId.trim();
  if (!isEuBedrockModelId(trimmed)) {
    throw new Error("BEDROCK_MODEL_ID must start with eu.");
  }
  return trimmed;
}

export function isEuAwsRegion(region: string): boolean {
  return region.trim().toLowerCase().startsWith("eu-");
}

export function requireEuAwsRegion(region: string): string {
  const trimmed = region.trim();
  if (!isEuAwsRegion(trimmed)) {
    throw new Error("AWS_REGION must be an EU region (eu-*).");
  }
  return trimmed;
}
