"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckIcon,
  MicIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/desk/ui/button";
import { Input } from "@/components/desk/ui/input";
import { Label } from "@/components/desk/ui/label";
import { Textarea } from "@/components/desk/ui/textarea";
import { useAudioWaveform } from "@/lib/dictation/use-audio-waveform";
import {
  mergeDictationIntoValue,
  useSimpleDictation,
} from "@/lib/dictation/use-simple-dictation";
import {
  createUserNote,
  deleteUserNote,
  removeUserNoteFile,
  updateUserNote,
} from "@/lib/notes/actions";
import type { UserNote, UserNoteFile } from "@/lib/notes/types";
import { MAX_FILES_PER_NOTE, validateNoteFile } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

const NOTES_BASE = "/notizen";

type FieldTarget = "title" | "body";

const toolbarBtnClass =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

function DictationWaveform({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  const levels = useAudioWaveform(active, 16);

  return (
    <div
      className={cn(
        "flex h-9 w-16 shrink-0 items-center justify-end gap-[2px]",
        !active && "opacity-35",
        className
      )}
      aria-hidden
    >
      {levels.map((level, index) => (
        <span
          key={index}
          className="w-[2px] rounded-full bg-foreground/45 transition-[height,opacity] duration-75 ease-out"
          style={{
            height: `${Math.max(10, Math.round(level * 100))}%`,
            opacity: 0.3 + level * 0.55,
          }}
        />
      ))}
    </div>
  );
}

function ToolbarIconButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70",
        "text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground",
        "disabled:pointer-events-none disabled:opacity-35",
        className
      )}
    >
      {children}
    </button>
  );
}

function mergeTitleDictation(current: string, dictated: string): string {
  return mergeDictationIntoValue(current, dictated)
    .replace(/\s+/g, " ")
    .trim();
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

type V1NoteFormProps = {
  mode: "create" | "edit";
  initial?: UserNote | null;
  /** Eingebettet im Notizen-Workspace (ohne Seiten-Chrome). */
  embedded?: boolean;
  onSaved?: (note: UserNote) => void;
  onDeleted?: (id: string) => void;
};

export function V1NoteForm({
  mode,
  initial,
  embedded = false,
  onSaved,
  onDeleted,
}: V1NoteFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyBoxRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [existingFiles, setExistingFiles] = useState<UserNoteFile[]>(
    initial?.files ?? []
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dictationTarget, setDictationTarget] = useState<FieldTarget | null>(
    null
  );
  const [bodyBoxMinHeight, setBodyBoxMinHeight] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    listening,
    liveText,
    hasSession: dictationOpen,
    startListening,
    stopListening,
    discardSession,
  } = useSimpleDictation();

  useEffect(() => {
    setTitle(initial?.title ?? "");
    setBody(initial?.body ?? "");
    setExistingFiles(initial?.files ?? []);
    setPendingFiles([]);
    setDictationTarget(null);
    setBodyBoxMinHeight(null);
    discardSession();
  }, [
    initial?.id,
    initial?.title,
    initial?.body,
    initial?.files,
    discardSession,
  ]);

  useEffect(() => {
    const el = bodyTextareaRef.current;
    if (!el || dictationTarget === "body") return;
    el.style.height = "auto";
    const maxPx = Math.min(window.innerHeight * 0.42, 14 * 16);
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 80), maxPx)}px`;
  }, [body, dictationTarget]);

  function goToNote(id: string) {
    router.push(`${NOTES_BASE}/${id}`);
    router.refresh();
  }

  function handleDelete() {
    if (!initial?.id) return;
    const label = title.trim() || initial.title.trim() || "diese Notiz";
    if (!window.confirm(`„${label}" dauerhaft löschen?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteUserNote(initial.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Notiz gelöscht.");
      onDeleted?.(initial.id);
      if (!embedded) {
        router.push(NOTES_BASE);
        router.refresh();
      }
    });
  }

  function clearDictation() {
    discardSession();
    setDictationTarget(null);
    setBodyBoxMinHeight(null);
  }

  function acceptDictation(dictated = stopListening()) {
    const trimmed = dictated.trim();
    if (!trimmed) {
      clearDictation();
      return;
    }
    if (dictationTarget === "title") {
      setTitle((prev) => mergeTitleDictation(prev, trimmed));
    } else {
      setBody((prev) => mergeDictationIntoValue(prev, trimmed));
    }
    clearDictation();
  }

  function startDictation(target: FieldTarget) {
    if (dictationOpen && dictationTarget !== target) {
      discardSession();
    }
    if (target === "body") {
      const height =
        bodyTextareaRef.current?.offsetHeight ??
        bodyBoxRef.current?.offsetHeight ??
        null;
      setBodyBoxMinHeight(height && height > 0 ? height : 80);
    } else {
      setBodyBoxMinHeight(null);
    }
    setDictationTarget(target);
    startListening();
  }

  function handleFilesSelected(list: FileList | null) {
    const next = Array.from(list ?? []);
    if (next.length === 0) return;

    for (const file of next) {
      const err = validateNoteFile(file);
      if (err) {
        toast.error("Datei nicht möglich", { description: err });
        return;
      }
    }

    setPendingFiles((prev) => {
      const total = existingFiles.length + prev.length + next.length;
      if (total > MAX_FILES_PER_NOTE) {
        toast.error(`Maximal ${MAX_FILES_PER_NOTE} Dateien pro Notiz.`);
        return prev;
      }
      const byKey = new Map(prev.map((file) => [fileKey(file), file]));
      for (const file of next) {
        byKey.set(fileKey(file), file);
      }
      return Array.from(byKey.values());
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleRemoveExisting(file: UserNoteFile) {
    if (!initial) return;
    if (!window.confirm(`„${file.filename}" von der Notiz entfernen?`)) {
      return;
    }
    startTransition(async () => {
      const result = await removeUserNoteFile(initial.id, file.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setExistingFiles((prev) => prev.filter((row) => row.id !== file.id));
      toast.success("Dokument entfernt.");
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    let nextTitle = title;
    let nextBody = body;
    if (dictationOpen) {
      const dictated = (listening ? stopListening() : liveText).trim();
      if (dictated) {
        if (dictationTarget === "title") {
          nextTitle = mergeTitleDictation(title, dictated);
        } else {
          nextBody = mergeDictationIntoValue(body, dictated);
        }
      }
      clearDictation();
    }

    const formData = new FormData();
    formData.set("title", nextTitle);
    formData.set("body", nextBody);
    for (const file of pendingFiles) {
      formData.append("files", file);
    }

    startTransition(async () => {
      const result =
        mode === "edit" && initial
          ? await updateUserNote(initial.id, formData)
          : await createUserNote(formData);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(mode === "edit" ? "Notiz gespeichert." : "Notiz angelegt.");
      onSaved?.(result.item);
      if (!embedded) {
        goToNote(result.item.id);
      }
    });
  }

  const titleDictating = dictationOpen && dictationTarget === "title";
  const bodyDictating = dictationOpen && dictationTarget === "body";
  const canSave =
    (title.trim().length > 0 ||
      (titleDictating && liveText.trim().length > 0)) &&
    (body.trim().length > 0 || (bodyDictating && liveText.trim().length > 0));
  const canAddMoreFiles =
    existingFiles.length + pendingFiles.length < MAX_FILES_PER_NOTE;

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col",
        embedded ? "overflow-y-auto" : "overflow-y-auto bg-muted/15"
      )}
    >
      <div
        className={cn(
          "flex w-full flex-1 flex-col",
          embedded
            ? "min-h-0"
            : "@container/main mx-auto max-w-[42rem] px-4 md:px-6"
        )}
      >
        {!embedded ? (
          <div className="pt-6 md:pt-8">
            <Link
              href={
                mode === "edit" && initial?.id
                  ? `${NOTES_BASE}/${initial.id}`
                  : NOTES_BASE
              }
              className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeftIcon className="size-4" />
              {mode === "edit"
                ? "Zurück zur Notiz"
                : "Zurück zur Notizen-Übersicht"}
            </Link>
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            embedded ? "px-4 py-4 md:px-6 md:py-5" : "py-6 md:py-8"
          )}
        >
          {!embedded ? (
            <header className="mb-6 space-y-1.5">
              <h1 className="font-heading text-2xl font-medium tracking-tight text-foreground md:text-[1.75rem]">
                {mode === "edit" ? "Notiz bearbeiten" : "Neue Notiz"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Persönliche Notiz — nur für Sie sichtbar. Tippen, diktieren oder
                Dokument anhängen.
              </p>
            </header>
          ) : null}

          <div className="flex flex-col gap-5">
            <div className="grid gap-1.5">
              <Label
                htmlFor="note-title"
                className="text-sm font-medium text-muted-foreground"
              >
                Titel
              </Label>
              {titleDictating ? (
                <div className="flex h-12 items-center gap-1.5 overflow-hidden rounded-xl border border-border/70 bg-background pr-1.5 pl-3.5">
                  <p className="min-w-0 flex-1 truncate text-sm leading-normal">
                    {title.trim() ? (
                      <span className="not-italic text-foreground">
                        {title}
                        {/\s$/.test(title) ? "" : " "}
                      </span>
                    ) : null}
                    <span className="italic text-muted-foreground">
                      {liveText || (listening ? "" : "…")}
                    </span>
                  </p>
                  <DictationWaveform active={listening} />
                  <ToolbarIconButton
                    label="Titel-Diktat verwerfen"
                    onClick={clearDictation}
                    className="ml-2"
                  >
                    <XIcon className="size-4" strokeWidth={2} />
                  </ToolbarIconButton>
                  <ToolbarIconButton
                    label="Titel-Diktat übernehmen"
                    onClick={() => acceptDictation()}
                    disabled={!liveText.trim() && !listening}
                  >
                    <CheckIcon className="size-4" strokeWidth={2} />
                  </ToolbarIconButton>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    id="note-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Kurzer Betreff…"
                    required={!titleDictating}
                    disabled={bodyDictating}
                    className="h-12 rounded-xl border-border/70 bg-background py-0 pr-12 pl-3.5 shadow-none"
                  />
                  <button
                    type="button"
                    onClick={() => startDictation("title")}
                    disabled={bodyDictating || pending}
                    aria-label="Titel diktieren"
                    title="Titel diktieren"
                    className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  >
                    <MicIcon className="size-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label
                htmlFor="note-body"
                className="text-sm font-medium text-muted-foreground"
              >
                Notiz
              </Label>
              <div
                className={cn(
                  "flex flex-col rounded-[1.25rem] border border-border/60 bg-background",
                  "shadow-[0_1px_3px_oklch(0.25_0.02_60/0.05)]",
                  "transition-[border-color,box-shadow] duration-150",
                  "focus-within:border-border focus-within:shadow-[0_2px_10px_oklch(0.25_0.02_60/0.07)]"
                )}
              >
                {bodyDictating ? (
                  <div
                    ref={bodyBoxRef}
                    className="max-h-[min(42dvh,14rem)] overflow-y-auto px-4 pt-3.5 pb-1 text-[0.95rem] leading-[1.6]"
                    style={{ minHeight: bodyBoxMinHeight ?? 80 }}
                  >
                    <p className="whitespace-pre-wrap">
                      {body.trim() ? (
                        <span className="not-italic text-foreground">
                          {body}
                          {/\s$/.test(body) ? "" : " "}
                        </span>
                      ) : null}
                      <span className="italic text-muted-foreground">
                        {liveText || (listening ? "" : "…")}
                      </span>
                    </p>
                  </div>
                ) : (
                  <Textarea
                    ref={bodyTextareaRef}
                    id="note-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Schreibe eine Notiz…"
                    required={!bodyDictating}
                    disabled={titleDictating}
                    rows={3}
                    className={cn(
                      "field-sizing-fixed max-h-[min(42dvh,14rem)] min-h-20 w-full resize-none overflow-y-auto",
                      "border-0 bg-transparent px-4 pt-3.5 pb-1 text-[0.95rem] leading-[1.6] shadow-none",
                      "placeholder:text-muted-foreground/50",
                      "focus-visible:border-0 focus-visible:ring-0"
                    )}
                  />
                )}

                <div className="mt-1 flex flex-wrap items-center gap-1 pr-1.5 pb-1.5 pl-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(e) => handleFilesSelected(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!canAddMoreFiles || pending || dictationOpen}
                    className={toolbarBtnClass}
                  >
                    <PlusIcon className="size-4" />
                    Dokumente anhängen
                  </button>

                  <div className="ml-auto flex h-9 items-center justify-end gap-1">
                    {bodyDictating ? (
                      <>
                        <DictationWaveform active={listening} />
                        <ToolbarIconButton
                          label="Diktat verwerfen"
                          onClick={clearDictation}
                          className="ml-2"
                        >
                          <XIcon className="size-4" strokeWidth={2} />
                        </ToolbarIconButton>
                        <ToolbarIconButton
                          label="Diktat übernehmen"
                          onClick={() => acceptDictation()}
                          disabled={!liveText.trim() && !listening}
                        >
                          <CheckIcon className="size-4" strokeWidth={2} />
                        </ToolbarIconButton>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startDictation("body")}
                        disabled={titleDictating || pending}
                        aria-label="Notiz diktieren"
                        title="Notiz diktieren"
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                      >
                        <MicIcon className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {bodyDictating ? (
                <p className="mt-1 text-left text-xs text-muted-foreground">
                  Notiz diktieren — mit ✓ übernehmen, danach speichern.
                  Steuerworte: Punkt, Komma, Absatz…
                </p>
              ) : null}
            </div>

            {existingFiles.length > 0 || pendingFiles.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {existingFiles.map((file) => (
                  <li key={file.id}>
                    <div className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-sm">
                      <a
                        href={`/api/notes/files/${file.id}?download=1`}
                        className="min-w-0 truncate text-foreground hover:underline"
                        title={file.filename}
                      >
                        {file.filename}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveExisting(file)}
                        disabled={pending}
                        aria-label={`${file.filename} entfernen`}
                        className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
                {pendingFiles.map((file) => (
                  <li key={fileKey(file)}>
                    <div className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-dashed border-border/70 bg-background px-2.5 py-1.5 text-sm">
                      <span
                        className="min-w-0 truncate text-muted-foreground"
                        title={file.name}
                      >
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingFiles((prev) =>
                            prev.filter((row) => fileKey(row) !== fileKey(file))
                          )
                        }
                        disabled={pending}
                        aria-label={`${file.name} entfernen`}
                        className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-1">
              {embedded && mode === "edit" && initial?.id ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleDelete}
                  disabled={pending}
                >
                  Löschen
                </Button>
              ) : null}
              <Button
                type="submit"
                disabled={pending || !canSave || dictationOpen}
                title={
                  dictationOpen
                    ? "Bitte Diktat zuerst übernehmen"
                    : undefined
                }
              >
                {pending ? "Speichern…" : "Speichern"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
