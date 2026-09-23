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

import {
  sendAiChatMessage,
  type AiChatMessage,
} from "@/lib/ai/chat-actions";
import { AI_CHAT_MESSAGE_MAX_CHARS } from "@/lib/ai/limits";
import { hrefFor } from "@/lib/area/paths";
import type { PracticeId } from "@/lib/modules";
import { Button } from "@/components/desk/ui/button";
import { Textarea } from "@/components/desk/ui/textarea";
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
  const analyseHref = hrefFor("case-facts-analysis", practiceArea);

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

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="font-heading text-2xl font-medium tracking-tight">KI</h1>
          <p className="text-sm text-muted-foreground">
            Einfacher Chat — Gespräch bleibt nur in diesem Tab (neu laden = weg).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetChat}
          disabled={isPending || messages.length === 0}
        >
          <RotateCcwIcon data-icon="inline-start" />
          Neuer Chat
        </Button>
      </div>

      <div
        className="shrink-0 rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950"
        role="note"
      >
        Bitte keine Mandanten- oder Falldaten einfügen. Dafür die{" "}
        <Link href={analyseHref} className="font-medium underline underline-offset-2">
          KI-Analyse
        </Link>{" "}
        mit Pseudonymisierung nutzen.
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-lg border border-border/70 bg-background px-4 py-4">
        {messages.length === 0 && !isPending ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Frage stellen — z. B. Formulierungshilfe oder allgemeine Orientierung.
          </p>
        ) : null}
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
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isPending ? (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
              Denkt nach…
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 space-y-2">
        <div className="relative">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Nachricht schreiben…"
            rows={3}
            disabled={isPending}
            className="resize-none pr-14"
            maxLength={AI_CHAT_MESSAGE_MAX_CHARS}
          />
          <Button
            type="button"
            size="icon"
            className="absolute right-2 bottom-2"
            onClick={handleSend}
            disabled={isPending || !draft.trim()}
            aria-label="Senden"
          >
            <ArrowUpIcon />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter senden · Shift+Enter neue Zeile
        </p>
      </div>
    </div>
  );
}
