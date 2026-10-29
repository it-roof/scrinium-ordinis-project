import { streamClaudeChat } from "@/lib/ai/bedrock";
import {
  AI_ERROR,
  AiGatewayError,
  userMessageForAiError,
} from "@/lib/ai/errors";
import { AI_CHAT_MAX_TOKENS, AI_CHAT_MESSAGE_MAX_CHARS } from "@/lib/ai/limits";
import { prepareBedrockMessages } from "@/lib/ai/prepare";
import { buildChatSystemPrompt } from "@/lib/ai/prompts";
import { repersonalize } from "@/lib/ai/pseudonymize";
import { practiceForDeskRole } from "@/lib/chat/practice";
import {
  appendOwnChatMessage,
  createOwnChat,
  getOwnChat,
} from "@/lib/chat/storage";
import { titleFromMessage } from "@/lib/chat/title";
import { getPracticeMatter } from "@/lib/matters/storage";
import { getSessionUser } from "@/lib/tenant/session";

export const maxDuration = 120;

type StreamEvent =
  | { type: "meta"; chatId: string; title: string; userMessageId: string }
  | { type: "text"; text: string }
  | { type: "done"; assistantMessageId: string }
  | { type: "error"; error: string };

function encodeEvent(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

function parseMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > AI_CHAT_MESSAGE_MAX_CHARS) return null;
  return text;
}

function parseChatId(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const id = value.trim();
  return id || null;
}

function parseMatterId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  return id;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Bitte anmelden." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Eingabe ungültig." }, { status: 400 });
  }

  const payload = body && typeof body === "object" ? body : null;
  const message = parseMessage(
    payload ? (payload as { message?: unknown }).message : null
  );
  if (!message) {
    return Response.json({ error: "Nachricht fehlt." }, { status: 400 });
  }

  const practice = practiceForDeskRole(user.deskRole);
  const requestedChatId = parseChatId(
    payload ? (payload as { chatId?: unknown }).chatId : null
  );
  const requestedMatterId = parseMatterId(
    payload ? (payload as { matterId?: unknown }).matterId : null
  );

  let chat = requestedChatId
    ? await getOwnChat({
        tenantId: user.tenantId,
        userId: user.id,
        practice,
        chatId: requestedChatId,
      })
    : null;

  if (requestedChatId && !chat) {
    return Response.json({ error: "Chat nicht gefunden." }, { status: 404 });
  }

  const matterId = chat?.matterId ?? requestedMatterId;
  const matter = matterId
    ? await getPracticeMatter({
        tenantId: user.tenantId,
        practice,
        matterId,
      })
    : null;

  if (matterId && !matter) {
    return Response.json({ error: "Akte nicht gefunden." }, { status: 404 });
  }

  if (!chat) {
    const created = await createOwnChat({
      tenantId: user.tenantId,
      userId: user.id,
      practice,
      title: titleFromMessage(message),
      matterId: matter?.id ?? null,
    });
    chat = { ...created, messages: [] };
  }

  const userRow = await appendOwnChatMessage({
    tenantId: user.tenantId,
    userId: user.id,
    practice,
    chatId: chat.id,
    role: "user",
    content: message,
  });
  if (!userRow) {
    return Response.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }

  const history = [...chat.messages, userRow];
  const prepared = prepareBedrockMessages(history);
  if (prepared.messages[0]?.role !== "user") {
    return Response.json({ error: "Eingabe ungültig." }, { status: 400 });
  }

  const mapping = prepared.mapping;
  const chatId = chat.id;
  const title = chat.title;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encodeEvent({
          type: "meta",
          chatId,
          title,
          userMessageId: userRow.id,
        })
      );

      let raw = "";
      try {
        for await (const chunk of streamClaudeChat({
          system: buildChatSystemPrompt(matter),
          messages: prepared.messages,
          maxTokens: AI_CHAT_MAX_TOKENS,
        })) {
          raw += chunk;
          controller.enqueue(
            encodeEvent({ type: "text", text: repersonalize(raw, mapping) })
          );
        }

        const reply = repersonalize(raw, mapping).trim();
        if (!reply) {
          controller.enqueue(
            encodeEvent({
              type: "error",
              error: "Die KI hat keine Antwort geliefert.",
            })
          );
          return;
        }

        const assistantRow = await appendOwnChatMessage({
          tenantId: user.tenantId,
          userId: user.id,
          practice,
          chatId,
          role: "assistant",
          content: reply,
        });
        if (!assistantRow) {
          controller.enqueue(
            encodeEvent({
              type: "error",
              error: "Antwort speichern fehlgeschlagen.",
            })
          );
          return;
        }

        controller.enqueue(
          encodeEvent({ type: "done", assistantMessageId: assistantRow.id })
        );
      } catch (err) {
        const code =
          err instanceof AiGatewayError ? err.code : AI_ERROR.AI_ERROR;
        console.error("[api/chat]", code);
        controller.enqueue(
          encodeEvent({ type: "error", error: userMessageForAiError(code) })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
