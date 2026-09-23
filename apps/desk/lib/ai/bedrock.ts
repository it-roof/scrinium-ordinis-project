import "server-only";

import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

import { AI_ERROR, AiGatewayError } from "@/lib/ai/errors";
import {
  requireEuAwsRegion,
  requireEuBedrockModelId,
} from "@/lib/ai/model-id";

export type AskClaudeInput = {
  system: string;
  user: string;
  maxTokens?: number;
  /** Override model; must still start with eu. */
  model?: string;
};

export type AskClaudeResult = {
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  model: string;
};

let cachedClient: BedrockRuntimeClient | null = null;

function requireEuModelId(modelId: string): string {
  try {
    return requireEuBedrockModelId(modelId);
  } catch {
    throw new AiGatewayError(
      AI_ERROR.AI_ERROR,
      "BEDROCK_MODEL_ID must start with eu."
    );
  }
}

export function getBedrockModelId(): string {
  const fromEnv = process.env.BEDROCK_MODEL_ID?.trim();
  if (!fromEnv) {
    throw new AiGatewayError(
      AI_ERROR.AI_ERROR,
      "BEDROCK_MODEL_ID is not set"
    );
  }
  return requireEuModelId(fromEnv);
}

function getClient(): BedrockRuntimeClient {
  if (cachedClient) return cachedClient;
  const regionRaw = process.env.AWS_REGION?.trim();
  if (!regionRaw) {
    throw new AiGatewayError(AI_ERROR.AI_ERROR, "AWS_REGION is not set");
  }
  let region: string;
  try {
    region = requireEuAwsRegion(regionRaw);
  } catch {
    throw new AiGatewayError(
      AI_ERROR.AI_ERROR,
      "AWS_REGION must be an EU region (eu-*)."
    );
  }
  // Credentials from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY via default chain
  cachedClient = new BedrockRuntimeClient({
    region,
  });
  return cachedClient;
}

export type AskClaudeChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AskClaudeChatInput = {
  system: string;
  messages: AskClaudeChatMessage[];
  maxTokens?: number;
  model?: string;
};

/**
 * Multi-turn Claude via Bedrock Converse (EU only).
 * Never log system/message content.
 */
export async function askClaudeChat(
  input: AskClaudeChatInput
): Promise<AskClaudeResult> {
  const model = requireEuModelId(input.model ?? getBedrockModelId());
  const maxTokens = input.maxTokens ?? 4000;
  const started = Date.now();

  if (!input.messages.length) {
    throw new AiGatewayError(AI_ERROR.VALIDATION, "Empty chat messages");
  }

  try {
    const client = getClient();
    const response = await client.send(
      new ConverseCommand({
        modelId: model,
        system: [{ text: input.system }],
        messages: input.messages.map((m) => ({
          role: m.role,
          content: [{ text: m.content }],
        })),
        inferenceConfig: {
          maxTokens,
        },
      })
    );

    const parts: string[] = [];
    for (const block of response.output?.message?.content ?? []) {
      if ("text" in block && typeof block.text === "string") {
        parts.push(block.text);
      }
    }

    return {
      text: parts.join("\n").trim(),
      inputTokens: response.usage?.inputTokens ?? null,
      outputTokens: response.usage?.outputTokens ?? null,
      latencyMs: Date.now() - started,
      model,
    };
  } catch (err) {
    if (err instanceof AiGatewayError) throw err;
    const name =
      err && typeof err === "object" && "name" in err
        ? String((err as { name: unknown }).name)
        : "UnknownError";
    console.error("[ai/bedrock]", name);
    if (name === "AccessDeniedException") {
      throw new AiGatewayError(AI_ERROR.AI_ACCESS_DENIED, name);
    }
    throw new AiGatewayError(AI_ERROR.AI_ERROR, name);
  }
}

/**
 * Invoke Claude via Bedrock Converse API (EU inference profile only).
 * Never log system/user content.
 */
export async function askClaude(input: AskClaudeInput): Promise<AskClaudeResult> {
  return askClaudeChat({
    system: input.system,
    messages: [{ role: "user", content: input.user }],
    maxTokens: input.maxTokens,
    model: input.model,
  });
}
