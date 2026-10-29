"use client";

import { MicIcon, SendHorizontalIcon, SquareIcon } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";

import {
  appendDictation,
  getSpeechRecognitionConstructor,
  type SpeechRecognitionLike,
} from "@/lib/chat/dictation";
import { cn } from "@/lib/utils";

export function ChatComposer({
  draft,
  busy,
  composerRef,
  onDraftChange,
  onSend,
  onStop,
  placeholder = "Wie kann ich helfen?",
  variant = "dock",
}: {
  draft: string;
  busy: boolean;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  placeholder?: string;
  variant?: "dock" | "inline";
}) {
  const inline = variant === "inline";
  const [listening, setListening] = useState(false);
  const [speechHint, setSpeechHint] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (busy && listening) stopListening();
  }, [busy, listening]);

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  function toggleDictation() {
    if (busy) return;
    if (listening) {
      stopListening();
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setSpeechHint("Spracheingabe wird in diesem Browser nicht unterstützt.");
      return;
    }

    setSpeechHint(null);
    const recognition = new SpeechRecognition();
    recognition.lang = "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalChunk = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result) continue;
        if (result.isFinal) {
          finalChunk += result[0]?.transcript ?? "";
        }
      }
      if (!finalChunk.trim()) return;
      const next = appendDictation(draftRef.current, finalChunk);
      onDraftChange(next);
      const field = composerRef.current;
      if (field) {
        field.style.height = "auto";
        field.style.height = `${Math.min(field.scrollHeight, 160)}px`;
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        setSpeechHint("Mikrofonzugriff wurde verweigert.");
      } else if (event.error && event.error !== "aborted") {
        setSpeechHint("Spracheingabe ist fehlgeschlagen.");
      }
      stopListening();
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch {
      setSpeechHint("Spracheingabe ist fehlgeschlagen.");
    }
  }

  function submit() {
    if (listening) stopListening();
    onSend();
  }

  return (
    <form
      className={inline ? "w-full" : "shrink-0 px-4 pb-5 sm:px-6"}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div
        className={
          inline
            ? "flex w-full items-end gap-2 rounded-2xl border border-border bg-card p-2.5"
            : "mx-auto flex w-full max-w-2xl items-end gap-2 rounded-sm border border-border bg-card p-2 shadow-[var(--shadow-soft)]"
        }
      >
        <label htmlFor="composer" className="sr-only">
          Nachricht
        </label>
        <textarea
          id="composer"
          ref={composerRef}
          rows={1}
          value={draft}
          placeholder={listening ? "Bitte sprechen …" : placeholder}
          disabled={busy}
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[0.98rem] leading-relaxed outline-none placeholder:text-muted-foreground disabled:opacity-60"
          onChange={(event) => {
            onDraftChange(event.target.value);
            const field = event.target;
            field.style.height = "auto";
            field.style.height = `${Math.min(field.scrollHeight, 160)}px`;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Antwort stoppen"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-85"
          >
            <SquareIcon className="size-3.5 fill-current" />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={toggleDictation}
              aria-pressed={listening}
              aria-label={listening ? "Diktat beenden" : "Diktieren"}
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors",
                listening
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <MicIcon className="size-4" />
            </button>
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Senden"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-85 disabled:opacity-30"
            >
              <SendHorizontalIcon className="size-4" />
            </button>
          </>
        )}
      </div>
      {speechHint ? (
        <p className="mx-auto mt-2 max-w-2xl px-1 text-center text-[0.7rem] text-muted-foreground">
          {speechHint}
        </p>
      ) : inline ? null : (
        <p className="mx-auto mt-2 max-w-2xl px-1 text-center text-[0.7rem] leading-relaxed text-muted-foreground">
          Orientierung, keine anwaltliche Prüfung.
        </p>
      )}
    </form>
  );
}
