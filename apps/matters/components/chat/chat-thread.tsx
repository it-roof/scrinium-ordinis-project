import { LetterCard } from "@/components/letters/letter-card";
import { ChatMarkdown } from "@/components/chat/chat-markdown";
import type { LetterRecord } from "@/lib/letters/types";

export type ThreadMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  error?: boolean;
  actionId?: string | null;
};

export function ChatThread({
  messages,
  firstName,
  matterTitle,
  letter,
  busy,
  onCreateLetter,
  onLetterChange,
}: {
  messages: ThreadMessage[];
  firstName: string;
  matterTitle?: string | null;
  letter?: LetterRecord | null;
  busy?: boolean;
  onCreateLetter?: (sourceMessageId: string) => void;
  onLetterChange?: (letter: LetterRecord) => void;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <h1 className="font-heading text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.025em] text-balance">
            {matterTitle
              ? matterTitle
              : firstName
                ? `Guten Tag, ${firstName}.`
                : "Guten Tag."}
          </h1>
          <p className="mt-4 text-[1.05rem] leading-relaxed text-muted-foreground">
            {matterTitle
              ? "Wobei kann ich in dieser Akte helfen?"
              : "Wobei kann ich helfen?"}
          </p>
        </div>
      </div>
    );
  }

  const lastAssistantId = [...messages]
    .reverse()
    .find(
      (message) =>
        message.role === "assistant" &&
        !message.pending &&
        !message.error &&
        message.actionId !== "create-letter" &&
        message.content.trim()
    )?.id;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      {messages.map((message) => {
        if (message.role === "user") {
          return (
            <div key={message.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-sm bg-muted px-4 py-3 text-[0.98rem] leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          );
        }

        if (message.actionId === "create-letter" && letter) {
          return (
            <div key={message.id} className="min-w-0">
              <LetterCard letter={letter} onLetterChange={onLetterChange ?? (() => undefined)} />
            </div>
          );
        }

        return (
          <div key={message.id} className="min-w-0">
            {message.pending && !message.content ? (
              <p className="text-sm text-muted-foreground">Denkt nach…</p>
            ) : message.error ? (
              <p className="text-[0.98rem] leading-relaxed text-destructive">
                {message.content}
              </p>
            ) : (
              <>
                <ChatMarkdown content={message.content} />
                {message.id === lastAssistantId && onCreateLetter ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onCreateLetter(message.id)}
                    className="mt-3 inline-flex h-8 items-center rounded-full bg-muted px-3 text-[13px] hover:bg-muted/80 disabled:opacity-50"
                  >
                    Als Schreiben
                  </button>
                ) : null}
              </>
            )}
            {message.pending && message.content ? (
              <span
                aria-hidden
                className="mt-1 inline-block h-4 w-[2px] animate-pulse bg-foreground align-middle"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
