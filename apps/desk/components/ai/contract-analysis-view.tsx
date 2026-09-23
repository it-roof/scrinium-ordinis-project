"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import {
  ArrowUpIcon,
  CheckIcon,
  DownloadIcon,
  FilePenLineIcon,
  MicIcon,
  PaperclipIcon,
  PlusIcon,
  RotateCcwIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  continueContractWorkspace,
  draftImprovedContract,
  exportContractDocx,
  startContractWorkspace,
} from "@/lib/ai/contract-workspace-actions";
import {
  AI_CONTRACT_RAW_MAX_BYTES,
  detectContractUploadKind,
} from "@/lib/ai/contract-extract";
import {
  AI_CONTRACT_WORKSPACE_MESSAGE_MAX_CHARS,
  AI_CONTRACT_WORKSPACE_START_MAX_CHARS,
  type ContractWorkspaceMessage,
} from "@/lib/ai/contract-kit/session";
import type { ContractWorkspaceFilePayload } from "@/lib/ai/contract-kit/types";
import { DocMarkdown } from "@/components/docs/doc-markdown";
import { useAudioWaveform } from "@/lib/dictation/use-audio-waveform";
import {
  mergeDictationIntoValue,
  useSimpleDictation,
} from "@/lib/dictation/use-simple-dictation";
import { cn } from "@/lib/utils";

type DisplayMessage = ContractWorkspaceMessage & {
  id: string;
  kind?: "draft";
  /** Angehängte Datei (Anzeige in der User-Bubble). */
  attachmentName?: string;
};

type DictationField = "start" | "chat";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildUserDisplay(text: string, filename: string | null): string {
  const trimmed = text.trim();
  if (filename && trimmed) return `${filename}\n\n${trimmed}`;
  if (filename) return `Vertrag: ${filename}`;
  return trimmed;
}

function userBubbleBody(msg: DisplayMessage): string {
  if (!msg.attachmentName) return msg.content;
  const prefixA = `Vertrag: ${msg.attachmentName}`;
  if (msg.content === prefixA) return "";
  const prefixB = `${msg.attachmentName}\n\n`;
  if (msg.content.startsWith(prefixB)) {
    return msg.content.slice(prefixB.length);
  }
  return msg.content;
}

async function fileToPayload(
  file: File
): Promise<ContractWorkspaceFilePayload> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return {
    name: file.name,
    mimeType: file.type || "",
    base64: btoa(binary),
  };
}

function downloadBase64Docx(filename: string, base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function DictationWaveform({ active }: { active: boolean }) {
  const levels = useAudioWaveform(active, 22);

  return (
    <div
      className={cn(
        "flex h-8 w-[4.5rem] shrink-0 items-center justify-end gap-[2px]",
        !active && "opacity-35"
      )}
      aria-hidden
    >
      {levels.map((level, index) => (
        <span
          key={index}
          className="w-[2px] rounded-full transition-[height,opacity] duration-75 ease-out"
          style={{
            background: "var(--b-ink)",
            height: `${Math.max(10, Math.round(level * 100))}%`,
            opacity: 0.25 + level * 0.55,
          }}
        />
      ))}
    </div>
  );
}

function ProcessingIndicator() {
  return (
    <div
      className="lab-chat-processing flex items-center gap-2.5"
      aria-live="polite"
    >
      <span className="lab-chat-processing-dots" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <span className="text-[0.9375rem]" style={{ color: "var(--b-muted)" }}>
        Wird bearbeitet…
      </span>
    </div>
  );
}

export function ContractAnalysisView() {
  const [phase, setPhase] = useState<"start" | "chat">("start");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [startText, setStartText] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [lastDraftBody, setLastDraftBody] = useState<string | null>(null);
  const [dictationField, setDictationField] = useState<DictationField | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const [dragActive, setDragActive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startInputRef = useRef<HTMLTextAreaElement>(null);
  const dragDepthRef = useRef(0);

  const {
    listening,
    liveText,
    hasSession: dictationOpen,
    startListening,
    stopListening,
    discardSession,
  } = useSimpleDictation();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  useEffect(() => {
    if (phase === "start" && dictationField !== "start") {
      startInputRef.current?.focus();
    }
  }, [phase, dictationField]);

  function clearDictation() {
    discardSession();
    setDictationField(null);
  }

  function acceptDictation(dictated = stopListening()) {
    const trimmed = dictated.trim();
    if (!trimmed) {
      clearDictation();
      return;
    }
    if (dictationField === "chat") {
      setDraft((prev) => mergeDictationIntoValue(prev, trimmed));
    } else {
      setStartText((prev) => mergeDictationIntoValue(prev, trimmed));
    }
    clearDictation();
  }

  function beginDictation(field: DictationField) {
    if (dictationOpen && dictationField !== field) {
      acceptDictation(stopListening());
    }
    setDictationField(field);
    startListening();
  }

  function resetAll() {
    clearDictation();
    setPhase("start");
    setPendingFile(null);
    setStartText("");
    setMessages([]);
    setDraft("");
    setLastDraftBody(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function acceptContractFile(file: File | undefined | null): boolean {
    if (!file) return false;
    if (!detectContractUploadKind(file.name, file.type || "")) {
      toast.error("Nur Word (.docx) oder PDF (.pdf) möglich.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return false;
    }
    if (file.size > AI_CONTRACT_RAW_MAX_BYTES) {
      toast.error(
        `Datei zu groß (max. ${(AI_CONTRACT_RAW_MAX_BYTES / (1024 * 1024)).toFixed(1)} MB).`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return false;
    }
    if (dictationOpen) {
      clearDictation();
    }
    // Drop während Chat → neue Analyse mit dieser Datei
    if (phase === "chat") {
      setMessages([]);
      setDraft("");
      setLastDraftBody(null);
      setStartText("");
      setPhase("start");
    }
    setPendingFile(file);
    toast.success(`${file.name} angehängt.`);
    return true;
  }

  function handleFileChange(fileList: FileList | null) {
    acceptContractFile(fileList?.[0]);
  }

  function fileFromDataTransfer(dt: DataTransfer | null): File | null {
    if (!dt) return null;
    if (dt.files?.length) {
      return dt.files[0] ?? null;
    }
    const item = Array.from(dt.items ?? []).find(
      (entry) => entry.kind === "file"
    );
    return item?.getAsFile() ?? null;
  }

  function onDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setDragActive(true);
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setDragActive(false);
    }
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setDragActive(false);
    if (isPending) {
      toast.error("Bitte warten — Analyse läuft noch.");
      return;
    }
    acceptContractFile(fileFromDataTransfer(event.dataTransfer));
  }

  function handleStart() {
    let text = startText;
    if (dictationOpen && dictationField === "start") {
      const dictated = stopListening();
      if (dictated.trim()) {
        text = mergeDictationIntoValue(startText, dictated);
      }
      discardSession();
      setDictationField(null);
    }

    if (!pendingFile && !text.trim()) {
      toast.error("Bitte Vertrag hochladen oder Sachverhalt eingeben.");
      return;
    }
    if (text.trim().length > AI_CONTRACT_WORKSPACE_START_MAX_CHARS) {
      toast.error(
        `Maximal ${AI_CONTRACT_WORKSPACE_START_MAX_CHARS.toLocaleString("de-DE")} Zeichen.`
      );
      return;
    }

    const fileForSend = pendingFile;
    const trimmed = text.trim();
    const userDisplay = buildUserDisplay(trimmed, fileForSend?.name ?? null);
    const userMsg: DisplayMessage = {
      id: newId(),
      role: "user",
      content: userDisplay,
      attachmentName: fileForSend?.name,
    };

    // Sofort Claude-Feeling: Composer nach unten, User rechts, links „Wird bearbeitet…“
    setMessages([userMsg]);
    setPhase("chat");
    setPendingFile(null);
    setStartText("");
    if (fileInputRef.current) fileInputRef.current.value = "";

    startTransition(async () => {
      try {
        const filePayload = fileForSend
          ? await fileToPayload(fileForSend)
          : undefined;
        const result = await startContractWorkspace({
          message: text,
          file: filePayload,
        });
        if (!result.success) {
          toast.error(result.error);
          setMessages([]);
          setPhase("start");
          setStartText(text);
          if (fileForSend) setPendingFile(fileForSend);
          return;
        }
        setMessages([
          {
            ...userMsg,
            content: result.userDisplay,
            attachmentName: fileForSend?.name,
          },
          { id: newId(), role: "assistant", content: result.reply },
        ]);
      } catch (err) {
        console.error("[contract-analysis]", err);
        toast.error("Analyse fehlgeschlagen. Bitte erneut versuchen.");
        setMessages([]);
        setPhase("start");
        setStartText(text);
        if (fileForSend) setPendingFile(fileForSend);
      }
    });
  }

  function historyForApi(): ContractWorkspaceMessage[] {
    return messages.map(({ role, content }) => ({ role, content }));
  }

  function handleSend() {
    let text = draft.trim();
    if (dictationOpen && dictationField === "chat") {
      const dictated = stopListening();
      if (dictated.trim()) {
        text = mergeDictationIntoValue(draft, dictated).trim();
      }
      discardSession();
      setDictationField(null);
    }
    if (!text || isPending) return;
    if (text.length > AI_CONTRACT_WORKSPACE_MESSAGE_MAX_CHARS) {
      toast.error(
        `Maximal ${AI_CONTRACT_WORKSPACE_MESSAGE_MAX_CHARS} Zeichen.`
      );
      return;
    }

    const history = historyForApi();
    const userMsg: DisplayMessage = {
      id: newId(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");

    startTransition(async () => {
      const result = await continueContractWorkspace({
        history,
        message: text,
      });
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

  function handleDraftContract() {
    if (isPending || messages.length === 0) return;
    if (dictationOpen) clearDictation();
    const history = historyForApi();
    const userMsg: DisplayMessage = {
      id: newId(),
      role: "user",
      content: "Verbesserten Vertrag erstellen",
    };
    setMessages((prev) => [...prev, userMsg]);

    startTransition(async () => {
      const result = await draftImprovedContract({ history });
      if (!result.success) {
        toast.error(result.error);
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        return;
      }
      setLastDraftBody(result.reply);
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          content: result.reply,
          kind: "draft",
        },
      ]);
    });
  }

  function handleDownloadDocx(body: string) {
    startTransition(async () => {
      const result = await exportContractDocx({
        title: "Vertragsentwurf",
        body,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      downloadBase64Docx(result.filename, result.base64);
      toast.success("Word-Datei heruntergeladen.");
    });
  }

  function onComposerKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
    mode: "start" | "chat"
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (mode === "start") handleStart();
      else handleSend();
    }
  }

  const startDictating = dictationOpen && dictationField === "start";
  const chatDictating = dictationOpen && dictationField === "chat";
  const canStart =
    Boolean(
      pendingFile || startText.trim() || (startDictating && liveText.trim())
    ) && !isPending;
  const canSendChat =
    !isPending &&
    Boolean(draft.trim() || (chatDictating && liveText.trim()));

  function renderComposerRight(field: DictationField) {
    const dictating = field === "start" ? startDictating : chatDictating;
    const canSend = field === "start" ? canStart : canSendChat;
    const onSend = field === "start" ? handleStart : handleSend;

    return (
      <div className="lab-chat-toolbar-right">
        {dictating ? (
          <>
            <DictationWaveform active={listening} />
            <button
              type="button"
              className="lab-chat-icon-btn"
              onClick={clearDictation}
              aria-label="Diktat verwerfen"
              title="Verwerfen"
            >
              <XIcon className="size-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              className="lab-chat-icon-btn"
              data-active="true"
              onClick={() => acceptDictation()}
              disabled={!liveText.trim() && !listening}
              aria-label="Diktat übernehmen"
              title="Übernehmen"
            >
              <CheckIcon className="size-4" strokeWidth={2} />
            </button>
            {listening ? (
              <button
                type="button"
                className="lab-chat-icon-btn"
                data-active="true"
                onClick={() => stopListening()}
                aria-label="Aufnahme stoppen"
                title="Stoppen"
              >
                <SquareIcon className="size-3.5" fill="currentColor" />
              </button>
            ) : null}
          </>
        ) : (
          <button
            type="button"
            className="lab-chat-icon-btn"
            disabled={isPending}
            onClick={() => beginDictation(field)}
            aria-label="Diktieren"
            title="Diktieren"
          >
            <MicIcon className="size-4" strokeWidth={1.75} />
          </button>
        )}
        <button
          type="button"
          className="lab-chat-send"
          disabled={!canSend}
          onClick={onSend}
          aria-label={
            field === "start"
              ? isPending
                ? "Analysiert"
                : "Analyse starten"
              : "Senden"
          }
        >
          <ArrowUpIcon className="size-4" strokeWidth={2.25} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn("lab-chat", dragActive && "lab-chat--drag")}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {dragActive ? (
        <div className="lab-chat-drop-overlay" aria-hidden>
          <p className="b-display text-[1.25rem] font-medium tracking-[-0.02em]">
            Vertrag hier ablegen
          </p>
          <p className="b-meta mt-1">Word (.docx) oder PDF</p>
        </div>
      ) : null}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        disabled={isPending || dictationOpen}
        onChange={(e) => handleFileChange(e.target.files)}
      />

      {phase === "start" ? (
        <div className="lab-chat-scroll flex flex-col">
          <div className="mx-auto flex w-full max-w-[48rem] flex-1 flex-col justify-center px-5 py-12 md:px-8">
            <header className="mx-auto max-w-xl text-center">
              <h1 className="b-display text-[1.75rem] font-medium tracking-[-0.03em] md:text-[2rem]">
                Was soll analysiert werden?
              </h1>
              <p className="b-lead mx-auto mt-3 text-center text-[1.05rem] leading-[1.55]">
                Vertrag anhängen (auch per Drag & Drop) oder Sachverhalt
                schreiben — tippen oder diktieren.
              </p>
            </header>

            <div className="lab-chat-composer mx-auto mt-10 w-full max-w-[48rem] px-4 pt-4 pb-3 md:px-5">
              {pendingFile ? (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="lab-chat-file">
                    <PaperclipIcon className="size-3.5 opacity-70" />
                    <span className="max-w-[16rem] truncate">
                      {pendingFile.name}
                    </span>
                    <button
                      type="button"
                      className="ml-0.5 rounded-full p-0.5 opacity-60 hover:opacity-100"
                      aria-label="Datei entfernen"
                      disabled={startDictating}
                      onClick={() => {
                        setPendingFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </span>
                </div>
              ) : null}

              {startDictating ? (
                <div className="min-h-[5.5rem] whitespace-pre-wrap text-[1rem] leading-[1.55]">
                  {startText.trim() ? (
                    <span>
                      {startText}
                      {/\s$/.test(startText) ? "" : " "}
                    </span>
                  ) : null}
                  <span style={{ color: "var(--b-faint)", fontStyle: "italic" }}>
                    {liveText || (listening ? "" : "…")}
                  </span>
                </div>
              ) : (
                <textarea
                  ref={startInputRef}
                  value={startText}
                  onChange={(e) => setStartText(e.target.value)}
                  onKeyDown={(e) => onComposerKeyDown(e, "start")}
                  placeholder="Wie kann ich helfen?"
                  rows={3}
                  maxLength={AI_CONTRACT_WORKSPACE_START_MAX_CHARS}
                  disabled={isPending}
                />
              )}

              <div className="lab-chat-toolbar">
                <button
                  type="button"
                  className="lab-chat-icon-btn"
                  disabled={isPending || startDictating}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Word oder PDF anhängen"
                  title="Anhängen"
                >
                  <PlusIcon className="size-4" strokeWidth={2} />
                </button>
                {renderComposerRight("start")}
              </div>
            </div>

            <p className="b-meta mx-auto mt-4 max-w-md text-center text-[0.75rem]">
              {startDictating
                ? "Diktieren — ✓ übernehmen · Steuerworte: Punkt, Komma, Absatz…"
                : "Datei-Upload geht derzeit ungeschwärzt an Claude (EU). Nur in diesem Tab."}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-3.5 md:px-8">
            <p
              className="truncate text-[0.875rem] font-medium"
              style={{ color: "var(--b-muted)" }}
            >
              Vertragsanalyse
            </p>
            <button
              type="button"
              className="lab-chat-chip"
              disabled={isPending}
              onClick={resetAll}
            >
              <RotateCcwIcon className="size-3.5" />
              Neu
            </button>
          </div>

          <div className="lab-chat-scroll">
            <div className="mx-auto flex w-full max-w-[48rem] flex-col gap-7 px-5 pb-8 pt-2 md:px-8">
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="lab-chat-user max-w-[min(85%,36rem)] space-y-2 px-4 py-3 text-[0.9875rem] leading-[1.6]">
                      {msg.attachmentName ? (
                        <span className="lab-chat-file">
                          <PaperclipIcon className="size-3.5 opacity-70" />
                          <span className="max-w-[14rem] truncate">
                            {msg.attachmentName}
                          </span>
                        </span>
                      ) : null}
                      {userBubbleBody(msg) ? (
                        <div className="whitespace-pre-wrap">
                          {userBubbleBody(msg)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="lab-chat-assistant space-y-3">
                    <div className="prose prose-neutral max-w-none dark:prose-invert">
                      <DocMarkdown content={msg.content} />
                    </div>
                    {msg.kind === "draft" ? (
                      <button
                        type="button"
                        className="lab-chat-chip"
                        disabled={isPending}
                        onClick={() => handleDownloadDocx(msg.content)}
                      >
                        <DownloadIcon className="size-3.5" />
                        Als Word herunterladen
                      </button>
                    ) : null}
                  </div>
                )
              )}

              {isPending ? <ProcessingIndicator /> : null}
              <div ref={bottomRef} />
            </div>
          </div>

          <div
            className="shrink-0 px-5 pb-5 pt-1 md:px-8 md:pb-7"
            style={{
              background:
                "linear-gradient(to top, var(--b-bg) 55%, transparent)",
            }}
          >
            <div className="mx-auto w-full max-w-[48rem]">
              <div className="mb-2.5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  className="lab-chat-chip"
                  disabled={isPending || messages.length === 0 || chatDictating}
                  onClick={handleDraftContract}
                >
                  <FilePenLineIcon className="size-3.5" />
                  Verbesserten Vertrag
                </button>
                {lastDraftBody ? (
                  <button
                    type="button"
                    className="lab-chat-chip"
                    disabled={isPending}
                    onClick={() => handleDownloadDocx(lastDraftBody)}
                  >
                    <DownloadIcon className="size-3.5" />
                    Word
                  </button>
                ) : null}
              </div>

              <div className="lab-chat-composer px-4 pt-4 pb-3 md:px-5">
                {chatDictating ? (
                  <div className="min-h-[2.75rem] whitespace-pre-wrap text-[1rem] leading-[1.55]">
                    {draft.trim() ? (
                      <span>
                        {draft}
                        {/\s$/.test(draft) ? "" : " "}
                      </span>
                    ) : null}
                    <span
                      style={{ color: "var(--b-faint)", fontStyle: "italic" }}
                    >
                      {liveText || (listening ? "" : "…")}
                    </span>
                  </div>
                ) : (
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => onComposerKeyDown(e, "chat")}
                    placeholder="Nachricht an die Analyse…"
                    rows={1}
                    disabled={isPending}
                    maxLength={AI_CONTRACT_WORKSPACE_MESSAGE_MAX_CHARS}
                    className="min-h-[1.55rem]"
                  />
                )}
                <div className="lab-chat-toolbar">
                  <span />
                  {renderComposerRight("chat")}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
