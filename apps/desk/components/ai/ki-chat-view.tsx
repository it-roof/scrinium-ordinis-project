"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { ArrowUpIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";

import { KiActionBadges } from "@/components/ai/ki-action-badges";
import {
  sendAiChatMessage,
  type AiChatMessage,
} from "@/lib/ai/chat-actions";
import { AI_CHAT_MESSAGE_MAX_CHARS } from "@/lib/ai/limits";
import { hrefFor } from "@/lib/area/paths";
import type { PracticeId } from "@/lib/modules";
import { cn } from "@/lib/utils";

type DisplayMessage = AiChatMessage & { id: string };

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function KiChatView({ practiceArea }: { practiceArea: PracticeId }) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const aktenChatHref = hrefFor("akten-chat", practiceArea);
  const hasStarted = messages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  function resetChat() {
    setMessages([]);
    setDraft("");
  }

  function handleSend() {
    const text = draft.trim();
    if (!text || isPending) return;
    if (text.length > AI_CHAT_MESSAGE_MAX_CHARS) {
      toast.error(`Maximal ${AI_CHAT_MESSAGE_MAX_CHARS} Zeichen pro Nachricht.`);
      return;
    }

    const history: AiChatMessage[] = messages.map(({ role, content }) => ({
      role,
      content,
    }));
    const userMsg: DisplayMessage = { id: newId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");

    startTransition(async () => {
      const result = await sendAiChatMessage({ message: text, history });
      if (!result.success) {
        toast.error(result.error);
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        setDraft(text);
        return;
      }
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", content: result.reply },
      ]);
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  const composer = (
    <div className="lab-chat-composer">
      <KiActionBadges slot="free" />
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Nachricht schreiben…"
        rows={hasStarted ? 3 : 4}
        disabled={isPending}
        maxLength={AI_CHAT_MESSAGE_MAX_CHARS}
      />
      <div className="lab-chat-toolbar">
        <p className="lab-chat-note">Nur in diesem Tab — neu laden = weg.</p>
        <div className="lab-chat-toolbar-right">
          {hasStarted ? (
            <button
              type="button"
              className="lab-chat-icon-btn"
              onClick={resetChat}
              disabled={isPending}
              aria-label="Neuer Chat"
              title="Neuer Chat"
            >
              <RotateCcwIcon className="size-4" />
            </button>
          ) : null}
          <button
            type="button"
            className="lab-chat-send"
            onClick={handleSend}
            disabled={isPending || !draft.trim()}
            aria-label="Senden"
          >
            <ArrowUpIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="lab-chat flex min-h-0 flex-1 flex-col">
      <div
        className="shrink-0 border-b border-[var(--b-line)] px-4 py-3 lg:px-6"
        role="note"
      >
        <p className="b-meta">
          Keine Mandanten- oder Falldaten. Dafür den{" "}
          <Link href={aktenChatHref} className="underline underline-offset-2">
            Akten-Chat
          </Link>{" "}
          nutzen.
        </p>
      </div>

      {!hasStarted ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-4 py-8">
          <div className="max-w-md space-y-2 text-center">
            <p className="b-eyebrow">Freier Chat</p>
            <h1 className="b-title">KI</h1>
            <p className="b-lead">
              Formulierungen und Orientierung — ohne Aktenbezug.
            </p>
          </div>
          <div className="w-full max-w-xl">{composer}</div>
        </div>
      ) : (
        <>
          <div className="lab-chat-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 lg:px-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed",
                    msg.role === "user" ? "lab-chat-user" : "lab-chat-assistant"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isPending ? (
              <div className="lab-chat-processing flex items-center gap-2.5">
                <span className="lab-chat-processing-dots" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
                <span className="b-meta">Wird bearbeitet…</span>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
          <div className="shrink-0 border-t border-[var(--b-line)] px-4 py-3 lg:px-6">
            <div className="mx-auto max-w-3xl">{composer}</div>
          </div>
        </>
      )}
    </div>
  );
}
