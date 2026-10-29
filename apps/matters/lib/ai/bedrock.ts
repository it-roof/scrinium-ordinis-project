import "server-only";

import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";

import { AI_ERROR, AiGatewayError } from "@/lib/ai/errors";
import {
  requireEuAwsRegion,
  requireEuBedrockModelId,
} from "@/lib/ai/model-id";

export type AskClaudeChatMessage = {
  role: "user" | "assistant";
  content: string;
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
    throw new AiGatewayError(AI_ERROR.AI_ERROR, "BEDROCK_MODEL_ID is not set");
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
  cachedClient = new BedrockRuntimeClient({ region });
  return cachedClient;
}

export type StreamClaudeChatInput = {
  system: string;
  messages: AskClaudeChatMessage[];
  maxTokens?: number;
  model?: string;
};

/**
 * Multi-turn Claude via Bedrock ConverseStream (EU only).
 * Never log system/message content.
 */
export async function* streamClaudeChat(
  input: StreamClaudeChatInput
): AsyncGenerator<string> {
  const model = requireEuModelId(input.model ?? getBedrockModelId());
  const maxTokens = input.maxTokens ?? 4000;

  if (!input.messages.length) {
    throw new AiGatewayError(AI_ERROR.VALIDATION, "Empty chat messages");
  }

  try {
    const client = getClient();
    const response = await client.send(
      new ConverseStreamCommand({
        modelId: model,
        system: [{ text: input.system }],
        messages: input.messages.map((message) => ({
          role: message.role,
          content: [{ text: message.content }],
        })),
        inferenceConfig: { maxTokens },
      })
    );

    if (!response.stream) {
      throw new AiGatewayError(AI_ERROR.AI_ERROR, "Empty stream");
    }

    for await (const event of response.stream) {
      const text = event.contentBlockDelta?.delta?.text;
      if (text) yield text;
    }
  } catch (err) {
    if (err instanceof AiGatewayError) throw err;
    const errName =
      err && typeof err === "object" && "name" in err
        ? String((err as { name: unknown }).name)
        : "UnknownError";
    console.error("[ai/bedrock]", errName);
    if (errName === "AccessDeniedException") {
      throw new AiGatewayError(AI_ERROR.AI_ACCESS_DENIED, errName);
    }
    if (errName === "ValidationException") {
      throw new AiGatewayError(AI_ERROR.VALIDATION, errName);
    }
    throw new AiGatewayError(AI_ERROR.AI_ERROR, errName);
  }
}

export async function askClaude(input: {
  system: string;
  userText: string;
  maxTokens?: number;
}): Promise<string> {
  const model = requireEuModelId(getBedrockModelId());
  try {
    const response = await getClient().send(
      new ConverseCommand({
        modelId: model,
        system: [{ text: input.system }],
        messages: [
          {
            role: "user",
            content: [{ text: input.userText }],
          },
        ],
        inferenceConfig: { maxTokens: input.maxTokens ?? 4000 },
      })
    );

    const parts: string[] = [];
    for (const block of response.output?.message?.content ?? []) {
      if ("text" in block && typeof block.text === "string") {
        parts.push(block.text);
      }
    }
    return parts.join("\n").trim();
  } catch (err) {
    if (err instanceof AiGatewayError) throw err;
    const errName =
      err && typeof err === "object" && "name" in err
        ? String((err as { name: unknown }).name)
        : "UnknownError";
    console.error("[ai/bedrock]", errName);
    if (errName === "AccessDeniedException") {
      throw new AiGatewayError(AI_ERROR.AI_ACCESS_DENIED, errName);
    }
    if (errName === "ValidationException") {
      throw new AiGatewayError(AI_ERROR.VALIDATION, errName);
    }
    throw new AiGatewayError(AI_ERROR.AI_ERROR, errName);
  }
}

export type AskClaudeDocumentFormat = "pdf" | "docx";

export async function askClaudeWithDocument(input: {
  system: string;
  userText: string;
  document: {
    format: AskClaudeDocumentFormat;
    name: string;
    bytes: Uint8Array;
  };
  maxTokens?: number;
}): Promise<string> {
  const model = requireEuModelId(getBedrockModelId());
  const documentName = input.document.name.trim() || "document";
  if (!/^[A-Za-z0-9][A-Za-z0-9 \-()[\]]{0,198}$/.test(documentName)) {
    throw new AiGatewayError(AI_ERROR.VALIDATION, "Invalid document name");
  }
  if (!input.document.bytes.byteLength) {
    throw new AiGatewayError(AI_ERROR.VALIDATION, "Empty document");
  }

  try {
    const response = await getClient().send(
      new ConverseCommand({
        modelId: model,
        system: [{ text: input.system }],
        messages: [
          {
            role: "user",
            content: [
              {
                document: {
                  format: input.document.format,
                  name: documentName,
                  source: { bytes: input.document.bytes },
                },
              },
              { text: input.userText },
            ],
          },
        ],
        inferenceConfig: { maxTokens: input.maxTokens ?? 2000 },
      })
    );

    const parts: string[] = [];
    for (const block of response.output?.message?.content ?? []) {
      if ("text" in block && typeof block.text === "string") {
        parts.push(block.text);
      }
    }
    return parts.join("\n").trim();
  } catch (err) {
    if (err instanceof AiGatewayError) throw err;
    const errName =
      err && typeof err === "object" && "name" in err
        ? String((err as { name: unknown }).name)
        : "UnknownError";
    console.error("[ai/bedrock]", errName);
    if (errName === "AccessDeniedException") {
      throw new AiGatewayError(AI_ERROR.AI_ACCESS_DENIED, errName);
    }
    if (errName === "ValidationException") {
      throw new AiGatewayError(AI_ERROR.VALIDATION, errName);
    }
    throw new AiGatewayError(AI_ERROR.AI_ERROR, errName);
  }
}
