export type ChatStreamHandlers = {
  onMeta?: (meta: {
    chatId: string;
    title: string;
    userMessageId: string;
  }) => void;
  onText: (text: string) => void;
  onDone?: (assistantMessageId: string) => void;
};

export async function readChatStream(
  response: Response,
  handlers: ChatStreamHandlers
): Promise<void> {
  if (!response.body) {
    throw new Error("Keine Antwort vom Server.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let event: {
        type?: string;
        text?: string;
        error?: string;
        chatId?: string;
        title?: string;
        userMessageId?: string;
        assistantMessageId?: string;
      };
      try {
        event = JSON.parse(trimmed) as typeof event;
      } catch {
        continue;
      }
      if (event.type === "meta" && event.chatId && event.userMessageId) {
        handlers.onMeta?.({
          chatId: event.chatId,
          title: event.title ?? "Neuer Chat",
          userMessageId: event.userMessageId,
        });
      }
      if (event.type === "text" && typeof event.text === "string") {
        handlers.onText(event.text);
      }
      if (event.type === "done" && event.assistantMessageId) {
        handlers.onDone?.(event.assistantMessageId);
      }
      if (event.type === "error" && event.error) {
        throw new Error(event.error);
      }
    }
  }
}
