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

export type AskClaudeDocumentFormat = "pdf" | "docx";

export type AskClaudeDocumentAttachment = {
  format: AskClaudeDocumentFormat;
  /** Neutral alphanumeric name for Bedrock (no path/PII). */
  name: string;
  bytes: Uint8Array;
};

export type AskClaudeChatInput = {
  system: string;
  messages: AskClaudeChatMessage[];
  /** Attached only to the first user message (document read). */
  document?: AskClaudeDocumentAttachment;
  maxTokens?: number;
  model?: string;
};

function validateDocumentName(name: string): string {
  const documentName = name.trim() || "document";
  if (!/^[A-Za-z0-9][A-Za-z0-9 \-()[\]]{0,198}$/.test(documentName)) {
    throw new AiGatewayError(AI_ERROR.VALIDATION, "Invalid document name");
  }
  return documentName;
}

/**
 * Multi-turn Claude via Bedrock Converse (EU only).
 * Optional document is attached only to the first user message.
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

  let documentName: string | null = null;
  if (input.document) {
    documentName = validateDocumentName(input.document.name);
    if (!input.document.bytes.byteLength) {
      throw new AiGatewayError(AI_ERROR.VALIDATION, "Empty document");
    }
  }

  try {
    const client = getClient();
    let firstUserSeen = false;
    const messages = input.messages.map((m) => {
      if (
        m.role === "user" &&
        !firstUserSeen &&
        input.document &&
        documentName
      ) {
        firstUserSeen = true;
        return {
          role: m.role,
          content: [
            {
              document: {
                format: input.document.format,
                name: documentName,
                source: { bytes: input.document.bytes },
              },
            },
            { text: m.content },
          ],
        };
      }
      if (m.role === "user") firstUserSeen = true;
      return {
        role: m.role,
        content: [{ text: m.content }],
      };
    });

    const response = await client.send(
      new ConverseCommand({
        modelId: model,
        system: [{ text: input.system }],
        messages,
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

export type AskClaudeWithDocumentInput = {
  system: string;
  /** Short instruction; document bytes carry the contract. */
  userText: string;
  document: {
    format: AskClaudeDocumentFormat;
    /** Neutral alphanumeric name for Bedrock (no path/PII). */
    name: string;
    bytes: Uint8Array;
  };
  maxTokens?: number;
  model?: string;
};

/**
 * Claude Converse with an attached PDF/DOCX (vision/document reading).
 * Sends document bytes to Bedrock — caller owns PII policy.
 * Never log system/user/document content.
 */
export async function askClaudeWithDocument(
  input: AskClaudeWithDocumentInput
): Promise<AskClaudeResult> {
  const model = requireEuModelId(input.model ?? getBedrockModelId());
  const maxTokens = input.maxTokens ?? 4000;
  const started = Date.now();
  const documentName = input.document.name.trim() || "document";
  if (!/^[A-Za-z0-9][A-Za-z0-9 \-()[\]]{0,198}$/.test(documentName)) {
    throw new AiGatewayError(AI_ERROR.VALIDATION, "Invalid document name");
  }
  if (!input.document.bytes.byteLength) {
    throw new AiGatewayError(AI_ERROR.VALIDATION, "Empty document");
  }

  try {
    const client = getClient();
    const response = await client.send(
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
