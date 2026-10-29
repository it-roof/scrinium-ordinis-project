import { AI_CHAT_HISTORY_MAX_TURNS, AI_CHAT_MESSAGE_MAX_CHARS } from "@/lib/ai/limits";
import { mergeMappings, pseudonymize } from "@/lib/ai/pseudonymize";
import type { AskClaudeChatMessage } from "@/lib/ai/bedrock";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export function prepareBedrockMessages(history: ChatTurn[]): {
  messages: AskClaudeChatMessage[];
  mapping: Map<string, string>;
} {
  const mapping = new Map<string, string>();
  const source = history
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => ({
      role: msg.role,
      content: msg.content.trim().slice(0, AI_CHAT_MESSAGE_MAX_CHARS),
    }))
    .filter((msg) => msg.content.length > 0)
    .slice(-AI_CHAT_HISTORY_MAX_TURNS);

  const bedrockMessages: AskClaudeChatMessage[] = [];
  for (const msg of source) {
    const pipeline = pseudonymize(msg.content);
    mergeMappings(mapping, pipeline.mapping);
    bedrockMessages.push({
      role: msg.role,
      content: pipeline.text,
    });
  }

  const normalized: AskClaudeChatMessage[] = [];
  for (const msg of bedrockMessages) {
    const last = normalized[normalized.length - 1];
    if (last && last.role === msg.role) {
      last.content = `${last.content}\n\n${msg.content}`.slice(
        0,
        AI_CHAT_MESSAGE_MAX_CHARS
      );
      continue;
    }
    normalized.push({ ...msg });
  }

  return { messages: normalized, mapping };
}
