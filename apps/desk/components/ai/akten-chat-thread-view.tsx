"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import {
  ArrowUpIcon,
  CheckIcon,
  MicIcon,
  PaperclipIcon,
  PlusIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { DocMarkdown } from "@/components/docs/doc-markdown";
import { KiActionBadges } from "@/components/ai/ki-action-badges";
import {
  appendMatterChatDocumentAction,
  appendMatterChatUserMessageAction,
  finishAktenChatCaseFactsJobAction,
  finishAktenChatCreateEmailTextJobAction,
  finishAktenChatCreateLetterJobAction,
  previewAktenChatCaseFactsAction,
  previewAktenChatCounterReviewAction,
  previewAktenChatCreateEmailTextAction,
  previewAktenChatCreateLetterAction,
  sendAktenChatEmailAction,
  startAktenChatCaseFactsJobAction,
  startAktenChatCounterReviewJobAction,
  startAktenChatCreateEmailTextJobAction,
  startAktenChatCreateLetterJobAction,
} from "@/lib/ai/matter-chat/actions";
import {
  isAnalysisResultMessage,
  isCounterReviewResultMessage,
  isCreateLetterResultMessage,
  isEmailDraftResultMessage,
  pickLastAnalysisResult,
  pickLastEmailDraft,
  pickLastLetterSource,
} from "@/lib/ai/matter-chat/helpers";
import type { MatterAiChatMessageRecord } from "@/lib/ai/matter-chat/storage";
import type { PseudonymGatePolicy } from "@/lib/ai/gate-policy";
import {
  AI_CONTRACT_UPLOAD_MAX_BYTES,
  detectContractUploadKind,
} from "@/lib/ai/contract-extract";
import { AI_FACTS_MAX_CHARS } from "@/lib/ai/limits";
import { practiceBasePath } from "@/lib/area/paths";
import {
  mergeDictationIntoValue,
  useSimpleDictation,
} from "@/lib/dictation/use-simple-dictation";
import { useAudioWaveform } from "@/lib/dictation/use-audio-waveform";
import type { PracticeId } from "@/lib/modules";
import { cn } from "@/lib/utils";

type PreviewKind =
  | "analyze-case-facts"
  | "counter-review"
  | "create-letter"
  | "create-email-text";

type AnalysisPreview = {
  kind: PreviewKind;
  facts: string;
  pseudonymizedText: string;
  residuals: string[];
  gatePolicy: PseudonymGatePolicy;
  manualMarks: string[];
  dismissedResiduals: string[];
};

const POLL_MS = 2500;

function collectFacts(
  messages: MatterAiChatMessageRecord[],
  draft: string
): string {
  const fromDraft = draft.trim();
  if (fromDraft) return fromDraft;
  const users = messages.filter((m) => m.role === "user" && !m.actionId);
  const last = users[users.length - 1];
  return last?.content.trim() ?? "";
}

function parseAttachmentContent(content: string): {
  attachmentName: string | null;
  body: string;
} {
  const match = content.match(/^Anhang: ([^\n]+)(?:\n\n([\s\S]*))?$/);
  if (!match) {
    return { attachmentName: null, body: content };
  }
  return {
    attachmentName: match[1]?.trim() || null,
    body: match[2] ?? "",
  };
}

function ProcessingIndicator({ label }: { label?: string }) {
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
        {label ?? "Wird bearbeitet…"}
      </span>
    </div>
  );
}

function DictationWaveform({ active }: { active: boolean }) {
  const levels = useAudioWaveform(active, 22);
  return (
    <div
      className={cn(
        "flex h-8 w-[4.5rem] shrink-0 items-center justify-end gap-[2px]",
        !active && "opacity-40"
      )}
      aria-hidden
    >
      {levels.map((level, i) => (
        <span
          key={i}
          className="w-[2px] rounded-full"
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

function shouldRenderMarkdown(msg: MatterAiChatMessageRecord): boolean {
  return (
    isAnalysisResultMessage(msg) ||
    isCounterReviewResultMessage(msg) ||
    isEmailDraftResultMessage(msg) ||
    isCreateLetterResultMessage(msg)
  );
}

export function AktenChatThreadView({
  practice,
  matterId,
  matterTitle,
  chatId,
  chatTitle,
  initialMessages,
  consentGranted,
}: {
  practice: PracticeId;
  matterId: string;
  matterTitle: string;
  chatId: string;
  chatTitle: string;
  initialMessages: MatterAiChatMessageRecord[];
  consentGranted: boolean;
}) {
  const [messages, setMessages] =
    useState<MatterAiChatMessageRecord[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<AnalysisPreview | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJobActionId, setActiveJobActionId] =
    useState<PreviewKind>("analyze-case-facts");
  const [jobLabel, setJobLabel] = useState("Analyse läuft…");
  const [dictating, setDictating] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const base = practiceBasePath(practice);
  const hasStarted = messages.length > 0;

  const {
    listening,
    liveText,
    hasSession: dictationOpen,
    startListening,
    stopListening,
    discardSession,
  } = useSimpleDictation();

  const openResiduals = useMemo(() => {
    if (!preview) return [];
    return preview.residuals.filter((r) => {
      const key = r.trim().toLowerCase();
      if (
        preview.dismissedResiduals.some((d) => d.trim().toLowerCase() === key)
      ) {
        return false;
      }
      if (preview.manualMarks.some((m) => m.trim().toLowerCase() === key)) {
        return false;
      }
      return true;
    });
  }, [preview]);

  const canConfirmPreview =
    preview != null &&
    (preview.gatePolicy === "warn" || openResiduals.length === 0);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending, preview, activeJobId]);

  useEffect(() => {
    if (!hasStarted && !dictating) {
      startInputRef.current?.focus();
    }
  }, [hasStarted, dictating]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activeJobId) return;

    let cancelled = false;
    let locked = false;

    function stopPolling() {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    async function poll() {
      if (!activeJobId || locked) return;
      locked = true;
      const result =
        activeJobActionId === "create-letter"
          ? await finishAktenChatCreateLetterJobAction({
              chatId,
              practice,
              matterId,
              jobId: activeJobId,
            })
          : activeJobActionId === "create-email-text"
            ? await finishAktenChatCreateEmailTextJobAction({
                chatId,
                practice,
                matterId,
                jobId: activeJobId,
              })
            : await finishAktenChatCaseFactsJobAction({
                chatId,
                practice,
                matterId,
                jobId: activeJobId,
                actionId: activeJobActionId,
              });
      if (cancelled) return;
      if (!result.success) {
        toast.error(result.error);
        stopPolling();
        setActiveJobId(null);
        return;
      }
      if (
        result.data.status === "pending" ||
        result.data.status === "running"
      ) {
        setJobLabel(
          result.data.status === "pending"
            ? "In Warteschlange…"
            : activeJobActionId === "create-letter"
              ? "KI erstellt das Schreiben…"
              : activeJobActionId === "create-email-text"
                ? "KI erstellt den E-Mail-Text…"
                : activeJobActionId === "counter-review"
                  ? "KI prüft den Entwurf…"
                  : "KI analysiert den Sachverhalt…"
        );
        locked = false;
        return;
      }
      stopPolling();
      setActiveJobId(null);
      if (result.data.messages.length > 0) {
        setMessages((prev) => [...prev, ...result.data.messages]);
      }
      if (result.data.status === "succeeded") {
        toast.success(
          activeJobActionId === "create-letter"
            ? "Schreiben angelegt."
            : activeJobActionId === "create-email-text"
              ? "E-Mail-Text fertig."
              : activeJobActionId === "counter-review"
                ? "Gegenprüfung fertig."
                : "Analyse fertig."
        );
      } else if (result.data.status === "failed") {
        toast.error("Die Aktion ist fehlgeschlagen.");
      }
    }

    void poll();
    pollRef.current = setInterval(() => {
      void poll();
    }, POLL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [activeJobId, activeJobActionId, chatId, matterId, practice]);

  function clearDictation() {
    discardSession();
    setDictating(false);
  }

  function acceptDictation(dictated = stopListening()) {
    const trimmed = dictated.trim();
    if (!trimmed) {
      clearDictation();
      return;
    }
    setDraft((prev) => mergeDictationIntoValue(prev, trimmed));
    clearDictation();
  }

  function beginDictation() {
    setDictating(true);
    startListening();
  }

  function clearPendingFile() {
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function acceptUploadFile(file: File | undefined | null): boolean {
    if (!file) return false;
    if (!detectContractUploadKind(file.name, file.type || "")) {
      toast.error("Nur Word (.docx) oder PDF (.pdf) möglich.");
      clearPendingFile();
      return false;
    }
    if (file.size > AI_CONTRACT_UPLOAD_MAX_BYTES) {
      toast.error(
        `Datei zu groß (max. ${Math.round(AI_CONTRACT_UPLOAD_MAX_BYTES / (1024 * 1024))} MB).`
      );
      clearPendingFile();
      return false;
    }
    if (dictating) {
      clearDictation();
    }
    setPendingFile(file);
    toast.success(`${file.name} angehängt.`);
    return true;
  }

  function handleFileChange(fileList: FileList | null) {
    acceptUploadFile(fileList?.[0]);
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
    if (isPending || activeJobId) {
      toast.error("Bitte warten — Aktion läuft noch.");
      return;
    }
    acceptUploadFile(fileFromDataTransfer(event.dataTransfer));
  }

  function handleSend() {
    if (isPending || activeJobId) return;

    if (pendingFile) {
      const fileForSend = pendingFile;
      const note = draft.trim();
      const optimistic: MatterAiChatMessageRecord = {
        id: `tmp-${Date.now()}`,
        role: "user",
        content: note
          ? `Anhang: ${fileForSend.name}\n\n${note}`
          : `Anhang: ${fileForSend.name}`,
        actionId: null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      setDraft("");
      clearPendingFile();

      startTransition(async () => {
        const formData = new FormData();
        formData.set("chatId", chatId);
        formData.set("practice", practice);
        formData.set("note", note);
        formData.set("file", fileForSend);
        const result = await appendMatterChatDocumentAction(formData);
        if (!result.success) {
          toast.error(result.error);
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          setDraft(note);
          setPendingFile(fileForSend);
          return;
        }
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimistic.id),
          ...result.data.messages,
        ]);
        if (result.data.truncated) {
          toast.message("Text gekürzt — Datei war länger als das Limit.");
        } else {
          toast.success("Anhang übernommen.");
        }
      });
      return;
    }

    const text = draft.trim();
    if (!text) return;
    if (text.length > AI_FACTS_MAX_CHARS) {
      toast.error(`Maximal ${AI_FACTS_MAX_CHARS} Zeichen.`);
      return;
    }

    const optimistic: MatterAiChatMessageRecord = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
      actionId: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    startTransition(async () => {
      const result = await appendMatterChatUserMessageAction({
        chatId,
        practice,
        message: text,
      });
      if (!result.success) {
        toast.error(result.error);
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setDraft(text);
        return;
      }
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        ...result.data.messages,
      ]);
    });
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function startAnalysis() {
    if (!consentGranted) {
      toast.error("Keine KI-Einwilligung für diesen Mandanten.");
      return;
    }
    if (isPending || activeJobId || preview) return;

    const facts = collectFacts(messages, draft);
    if (!facts) {
      toast.error("Bitte zuerst den Sachverhalt schreiben.");
      return;
    }

    const fromDraft = Boolean(draft.trim());
    const optimisticUser: MatterAiChatMessageRecord | null = fromDraft
      ? {
          id: `tmp-facts-${Date.now()}`,
          role: "user",
          content: facts,
          actionId: null,
          createdAt: new Date().toISOString(),
        }
      : null;

    if (optimisticUser) {
      setMessages((prev) => [...prev, optimisticUser]);
      setDraft("");
    }

    startTransition(async () => {
      const result = await previewAktenChatCaseFactsAction({
        chatId,
        practice,
        matterId,
        facts,
        factsAlreadySaved: !fromDraft,
      });
      if (!result.success) {
        toast.error(result.error);
        if (optimisticUser) {
          setMessages((prev) =>
            prev.filter((m) => m.id !== optimisticUser.id)
          );
          setDraft(facts);
        }
        return;
      }
      setMessages((prev) => {
        const withoutTmp = optimisticUser
          ? prev.filter((m) => m.id !== optimisticUser.id)
          : prev;
        return [...withoutTmp, ...result.data.messages];
      });
      setPreview({
        kind: "analyze-case-facts",
        facts: result.data.facts,
        pseudonymizedText: result.data.pseudonymizedText,
        residuals: result.data.residuals,
        gatePolicy: result.data.gatePolicy,
        manualMarks: [],
        dismissedResiduals: [],
      });
    });
  }

  function startCounterReview() {
    if (!consentGranted) {
      toast.error("Keine KI-Einwilligung für diesen Mandanten.");
      return;
    }
    if (isPending || activeJobId || preview) return;
    if (!pickLastAnalysisResult(messages)) {
      toast.error("Zuerst „Sachverhalt analysieren“ ausführen.");
      return;
    }

    startTransition(async () => {
      const result = await previewAktenChatCounterReviewAction({
        chatId,
        practice,
        matterId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setMessages((prev) => [...prev, ...result.data.messages]);
      setPreview({
        kind: "counter-review",
        facts: result.data.facts,
        pseudonymizedText: result.data.pseudonymizedText,
        residuals: result.data.residuals,
        gatePolicy: result.data.gatePolicy,
        manualMarks: [],
        dismissedResiduals: [],
      });
    });
  }

  function startCreateLetter() {
    if (!consentGranted) {
      toast.error("Keine KI-Einwilligung für diesen Mandanten.");
      return;
    }
    if (isPending || activeJobId || preview) return;
    if (!pickLastLetterSource(messages)) {
      toast.error("Zuerst Analyse (optional Gegenprüfung) ausführen.");
      return;
    }

    startTransition(async () => {
      const result = await previewAktenChatCreateLetterAction({
        chatId,
        practice,
        matterId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setMessages((prev) => [...prev, ...result.data.messages]);
      setPreview({
        kind: "create-letter",
        facts: result.data.facts,
        pseudonymizedText: result.data.pseudonymizedText,
        residuals: result.data.residuals,
        gatePolicy: result.data.gatePolicy,
        manualMarks: [],
        dismissedResiduals: [],
      });
    });
  }

  function startCreateEmailText() {
    if (!consentGranted) {
      toast.error("Keine KI-Einwilligung für diesen Mandanten.");
      return;
    }
    if (isPending || activeJobId || preview) return;
    if (!pickLastLetterSource(messages) && !pickLastAnalysisResult(messages)) {
      toast.error("Zuerst Analyse oder Schreiben erstellen.");
      return;
    }

    startTransition(async () => {
      const result = await previewAktenChatCreateEmailTextAction({
        chatId,
        practice,
        matterId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setMessages((prev) => [...prev, ...result.data.messages]);
      setPreview({
        kind: "create-email-text",
        facts: result.data.facts,
        pseudonymizedText: result.data.pseudonymizedText,
        residuals: result.data.residuals,
        gatePolicy: result.data.gatePolicy,
        manualMarks: [],
        dismissedResiduals: [],
      });
    });
  }

  function sendEmail() {
    if (isPending || activeJobId || preview) return;
    if (!pickLastEmailDraft(messages)) {
      toast.error("Zuerst „E-Mail-Text erstellen“.");
      return;
    }
    const toEmail = draft.trim();
    if (!toEmail) {
      toast.error("Empfänger-E-Mail in den Composer schreiben, dann senden.");
      return;
    }

    startTransition(async () => {
      const result = await sendAktenChatEmailAction({
        chatId,
        practice,
        matterId,
        toEmail,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setDraft("");
      setMessages((prev) => [...prev, ...result.data.messages]);
      toast.success("E-Mail versendet.");
    });
  }

  function onBadge(actionId: string) {
    if (actionId === "analyze-case-facts") {
      startAnalysis();
      return;
    }
    if (actionId === "counter-review") {
      startCounterReview();
      return;
    }
    if (actionId === "create-letter") {
      startCreateLetter();
      return;
    }
    if (actionId === "create-email-text") {
      startCreateEmailText();
      return;
    }
    if (actionId === "send-email") {
      sendEmail();
      return;
    }
    toast.message("Diese Aktion folgt in den nächsten Schritten.");
  }

  function confirmPreview() {
    if (!preview || !canConfirmPreview) {
      toast.error(
        "Bitte alle unklaren Namen markieren oder als kein Personenbezug bestätigen."
      );
      return;
    }
    const kind = preview.kind;
    startTransition(async () => {
      const result =
        kind === "create-letter"
          ? await startAktenChatCreateLetterJobAction({
              chatId,
              practice,
              matterId,
              facts: preview.facts,
              manualMarks: preview.manualMarks,
              dismissedResiduals: preview.dismissedResiduals,
            })
          : kind === "create-email-text"
            ? await startAktenChatCreateEmailTextJobAction({
                chatId,
                practice,
                matterId,
                facts: preview.facts,
                manualMarks: preview.manualMarks,
                dismissedResiduals: preview.dismissedResiduals,
              })
            : kind === "counter-review"
              ? await startAktenChatCounterReviewJobAction({
                  chatId,
                  practice,
                  matterId,
                  facts: preview.facts,
                  manualMarks: preview.manualMarks,
                  dismissedResiduals: preview.dismissedResiduals,
                })
              : await startAktenChatCaseFactsJobAction({
                  chatId,
                  practice,
                  matterId,
                  facts: preview.facts,
                  manualMarks: preview.manualMarks,
                  dismissedResiduals: preview.dismissedResiduals,
                });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setPreview(null);
      setActiveJobActionId(kind);
      setActiveJobId(result.data.jobId);
      setJobLabel(
        kind === "create-letter"
          ? "Schreiben wird erstellt…"
          : kind === "create-email-text"
            ? "E-Mail-Text wird erstellt…"
            : kind === "counter-review"
              ? "Gegenprüfung gestartet…"
              : "Analyse gestartet…"
      );
      setMessages((prev) => [...prev, ...result.data.messages]);
    });
  }

  const busy = isPending || Boolean(activeJobId);
  const showDictation = dictating && dictationOpen;
  const canSend =
    !busy &&
    Boolean(pendingFile || draft.trim() || (showDictation && liveText.trim()));

  function renderComposer(mode: "start" | "chat") {
    return (
      <div className="lab-chat-composer px-4 pt-4 pb-3 md:px-5">
        {pendingFile ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="lab-chat-file">
              <PaperclipIcon className="size-3.5 opacity-70" />
              <span className="max-w-[16rem] truncate">{pendingFile.name}</span>
              <button
                type="button"
                className="ml-0.5 rounded-full p-0.5 opacity-60 hover:opacity-100"
                aria-label="Datei entfernen"
                disabled={showDictation}
                onClick={clearPendingFile}
              >
                <XIcon className="size-3.5" />
              </button>
            </span>
          </div>
        ) : null}

        {showDictation ? (
          <div
            className={cn(
              "whitespace-pre-wrap text-[1rem] leading-[1.55]",
              mode === "start" ? "min-h-[5.5rem]" : "min-h-[2.75rem]"
            )}
          >
            {draft.trim() ? (
              <span>
                {draft}
                {/\s$/.test(draft) ? "" : " "}
              </span>
            ) : null}
            <span style={{ color: "var(--b-faint)", fontStyle: "italic" }}>
              {liveText || (listening ? "" : "…")}
            </span>
          </div>
        ) : (
          <textarea
            ref={mode === "start" ? startInputRef : undefined}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onComposerKeyDown}
            placeholder={
              mode === "start"
                ? "Wie kann ich helfen?"
                : "Nachricht zur Akte — oder Empfänger-E-Mail für Versand…"
            }
            rows={mode === "start" ? 3 : 1}
            disabled={busy}
            maxLength={AI_FACTS_MAX_CHARS}
            className={mode === "chat" ? "min-h-[1.55rem]" : undefined}
          />
        )}

        <div className="lab-chat-toolbar">
          <button
            type="button"
            className="lab-chat-icon-btn"
            disabled={busy || showDictation}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Word oder PDF anhängen"
            title="Anhängen"
          >
            <PlusIcon className="size-4" strokeWidth={2} />
          </button>
          <div className="lab-chat-toolbar-right">
            {showDictation ? (
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
                disabled={busy}
                onClick={beginDictation}
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
              onClick={handleSend}
              aria-label="Senden"
            >
              <ArrowUpIcon className="size-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const previewPanel = preview ? (
    <div className="rounded-2xl border border-[var(--b-line)] bg-[var(--b-soft)]/50 p-4 space-y-3">
      <p className="b-meta font-medium">
        {preview.kind === "counter-review"
          ? "Pseudonym-Prüfung (Gegenprüfung)"
          : preview.kind === "create-letter"
            ? "Pseudonym-Prüfung (Schreiben)"
            : preview.kind === "create-email-text"
              ? "Pseudonym-Prüfung (E-Mail)"
              : "Pseudonym-Prüfung"}
      </p>
      {openResiduals.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {openResiduals.map((span) => (
            <li
              key={span}
              className="flex flex-wrap items-center gap-1 rounded-full border border-[var(--b-line)] bg-[var(--b-bg-elev)] px-2 py-1 text-xs"
            >
              <span className="max-w-[12rem] truncate">{span}</span>
              <button
                type="button"
                className="underline"
                onClick={() =>
                  setPreview((p) =>
                    p ? { ...p, manualMarks: [...p.manualMarks, span] } : p
                  )
                }
              >
                Markieren
              </button>
              <button
                type="button"
                className="underline"
                onClick={() =>
                  setPreview((p) =>
                    p
                      ? {
                          ...p,
                          dismissedResiduals: [
                            ...p.dismissedResiduals,
                            span,
                          ],
                        }
                      : p
                  )
                }
              >
                Kein Personenbezug
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="b-meta">Keine offenen Residuen.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="lab-chat-chip"
          disabled={isPending || !canConfirmPreview}
          onClick={confirmPreview}
        >
          {preview.kind === "counter-review"
            ? "Gegenprüfung starten"
            : preview.kind === "create-letter"
              ? "Schreiben erstellen"
              : preview.kind === "create-email-text"
                ? "E-Mail-Text erstellen"
                : "Analyse starten"}
        </button>
        <button
          type="button"
          className="lab-chat-chip"
          disabled={isPending}
          onClick={() => setPreview(null)}
        >
          Abbrechen
        </button>
      </div>
    </div>
  ) : null;

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
            Dokument hier ablegen
          </p>
          <p className="b-meta mt-1">Word (.docx) oder PDF</p>
        </div>
      ) : null}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        disabled={busy || showDictation}
        onChange={(e) => handleFileChange(e.target.files)}
      />

      {!hasStarted ? (
        <div className="lab-chat-scroll flex flex-col">
          <div className="mx-auto flex w-full max-w-[48rem] flex-1 flex-col justify-center px-5 py-12 md:px-8">
            <header className="mx-auto max-w-xl text-center">
              <h1 className="b-display text-[1.75rem] font-medium tracking-[-0.03em] md:text-[2rem]">
                {chatTitle || "Akten-Chat"}
              </h1>
            </header>

            <div className="mx-auto mt-10 w-full max-w-[48rem]">
              <div className="mb-3 flex flex-wrap justify-center gap-2">
                <KiActionBadges
                  slot="matter"
                  disabled={busy || Boolean(preview)}
                  onAction={onBadge}
                />
              </div>
              {renderComposer("start")}
            </div>

            <p className="b-meta mx-auto mt-4 max-w-md text-center text-[0.75rem]">
              {showDictation
                ? "Diktieren — ✓ übernehmen · Steuerworte: Punkt, Komma, Absatz…"
                : consentGranted
                  ? "Word/PDF anhängen oder tippen — Verlauf wird an der Akte gespeichert."
                  : "Keine KI-Einwilligung — Analyse gesperrt."}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-3.5 md:px-8">
            <div className="min-w-0">
              <p
                className="truncate text-[0.875rem] font-medium"
                style={{ color: "var(--b-muted)" }}
              >
                <Link
                  href={`${base}/akten-chat/${matterId}`}
                  className="hover:underline"
                >
                  {matterTitle}
                </Link>
                <span className="mx-1.5 opacity-40">·</span>
                {chatTitle || "Chat"}
              </p>
            </div>
          </div>

          <div className="lab-chat-scroll">
            <div className="mx-auto flex w-full max-w-[48rem] flex-col gap-7 px-5 pb-8 pt-2 md:px-8">
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="lab-chat-user max-w-[min(85%,36rem)] space-y-2 px-4 py-3 text-[0.9875rem] leading-[1.6]">
                      {(() => {
                        const parsed = parseAttachmentContent(msg.content);
                        return (
                          <>
                            {parsed.attachmentName ? (
                              <span className="lab-chat-file">
                                <PaperclipIcon className="size-3.5 opacity-70" />
                                <span className="max-w-[14rem] truncate">
                                  {parsed.attachmentName}
                                </span>
                              </span>
                            ) : null}
                            {parsed.body ? (
                              <div className="whitespace-pre-wrap">
                                {parsed.body}
                              </div>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="lab-chat-assistant space-y-3">
                    {shouldRenderMarkdown(msg) ? (
                      <div className="prose prose-neutral max-w-none dark:prose-invert">
                        <DocMarkdown content={msg.content} />
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-[0.9875rem] leading-[1.6]">
                        {msg.content}
                      </div>
                    )}
                  </div>
                )
              )}

              {previewPanel}

              {activeJobId ? <ProcessingIndicator label={jobLabel} /> : null}
              {isPending && !activeJobId ? <ProcessingIndicator /> : null}
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
                <KiActionBadges
                  slot="matter"
                  disabled={busy || Boolean(preview)}
                  onAction={onBadge}
                />
              </div>
              {renderComposer("chat")}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
