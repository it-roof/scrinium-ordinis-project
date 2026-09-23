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
          className="w-[2px] rounded-full transition-[height,opacity] duration-75 ease-out"
          style={{
            background: "color-mix(in srgb, var(--b-ink) 45%, transparent)",
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
      className={cn("lab-notes-icon-btn", className)}
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

export function V1NoteForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: UserNote | null;
}) {
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

  function handleDelete() {
    if (!initial?.id) return;
    const label = title.trim() || initial.title.trim() || "diese Notiz";
    if (!window.confirm(`„${label}“ dauerhaft löschen?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteUserNote(initial.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Notiz gelöscht.");
      router.push(NOTES_BASE);
      router.refresh();
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
    if (!window.confirm(`„${file.filename}“ von der Notiz entfernen?`)) {
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
      router.push(`${NOTES_BASE}/${result.item.id}`);
      router.refresh();
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

  const backHref =
    mode === "edit" && initial?.id
      ? `${NOTES_BASE}/${initial.id}`
      : NOTES_BASE;

  return (
    <div className="lab-notes lab-notes-form relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pt-12 pb-14 md:px-10 md:pt-14">
        <Link
          href={backHref}
          className="b-meta inline-flex w-fit items-center gap-1.5 transition-colors hover:text-[var(--b-ink)]"
        >
          <ArrowLeftIcon className="size-4" strokeWidth={1.75} />
          {mode === "edit" ? "Zurück zur Notiz" : "Zurück zur Übersicht"}
        </Link>

        <header className="mt-6 max-w-2xl">
          <h1 className="b-display b-title font-medium tracking-[-0.02em]">
            {mode === "edit" ? "Notiz bearbeiten" : "Neue Notiz"}
          </h1>
          <p className="b-lead mt-2 text-[1.0625rem] leading-[1.55]">
            Persönliche Notiz — nur für Sie sichtbar.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <div className="grid gap-1.5">
            <label
              htmlFor="note-title"
              className="b-meta font-medium"
              style={{ color: "var(--b-muted)" }}
            >
              Titel
            </label>
            {titleDictating ? (
              <div
                className="flex h-11 items-center gap-1.5 overflow-hidden rounded-[0.75rem] border pr-1.5 pl-3.5"
                style={{
                  borderColor: "var(--b-line)",
                  background: "var(--b-bg-elev)",
                }}
              >
                <p className="min-w-0 flex-1 truncate text-sm leading-normal">
                  {title.trim() ? (
                    <span style={{ color: "var(--b-ink)" }}>
                      {title}
                      {/\s$/.test(title) ? "" : " "}
                    </span>
                  ) : null}
                  <span className="italic" style={{ color: "var(--b-muted)" }}>
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
                <input
                  id="note-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Kurzer Betreff…"
                  required={!titleDictating}
                  disabled={bodyDictating}
                />
                <button
                  type="button"
                  onClick={() => startDictation("title")}
                  disabled={bodyDictating || pending}
                  aria-label="Titel diktieren"
                  title="Titel diktieren"
                  className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-[0.55rem] transition-colors disabled:pointer-events-none disabled:opacity-40"
                  style={{ color: "var(--b-muted)" }}
                >
                  <MicIcon className="size-4" strokeWidth={1.75} />
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="note-body"
              className="b-meta font-medium"
              style={{ color: "var(--b-muted)" }}
            >
              Notiz
            </label>
            <div className="lab-notes-composer">
              {bodyDictating ? (
                <div
                  ref={bodyBoxRef}
                  className="max-h-[min(42dvh,14rem)] overflow-y-auto px-3.5 pt-3.5 pb-1 text-[0.95rem] leading-[1.6]"
                  style={{ minHeight: bodyBoxMinHeight ?? 80 }}
                >
                  <p className="whitespace-pre-wrap">
                    {body.trim() ? (
                      <span style={{ color: "var(--b-ink)" }}>
                        {body}
                        {/\s$/.test(body) ? "" : " "}
                      </span>
                    ) : null}
                    <span
                      className="italic"
                      style={{ color: "var(--b-muted)" }}
                    >
                      {liveText || (listening ? "" : "…")}
                    </span>
                  </p>
                </div>
              ) : (
                <textarea
                  ref={bodyTextareaRef}
                  id="note-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Ihre Notiz…"
                  required={!bodyDictating}
                  disabled={titleDictating}
                  rows={3}
                  className="field-sizing-fixed max-h-[min(42dvh,14rem)] min-h-20 w-full overflow-y-auto"
                />
              )}

              <div className="mt-1 flex flex-wrap items-center gap-1 pr-1.5 pb-1.5 pl-1.5">
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
                  className="lab-notes-ghost-btn"
                >
                  <PlusIcon className="size-3.5" strokeWidth={1.75} />
                  Dokument anhängen
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
                      className="flex size-9 shrink-0 items-center justify-center rounded-[0.55rem] transition-colors disabled:pointer-events-none disabled:opacity-40"
                      style={{ color: "var(--b-muted)" }}
                    >
                      <MicIcon className="size-4" strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {bodyDictating ? (
              <p className="b-meta mt-1 text-left">
                Diktat mit ✓ übernehmen, danach speichern. Steuerworte: Punkt,
                Komma, Absatz…
              </p>
            ) : null}
          </div>

          {existingFiles.length > 0 || pendingFiles.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {existingFiles.map((file) => (
                <li key={file.id}>
                  <div className="lab-notes-file">
                    <a
                      href={`/api/notes/files/${file.id}?download=1`}
                      className="min-w-0 truncate hover:underline"
                      title={file.filename}
                    >
                      {file.filename}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveExisting(file)}
                      disabled={pending}
                      aria-label={`${file.filename} entfernen`}
                      className="flex size-6 shrink-0 items-center justify-center rounded-md disabled:opacity-40"
                      style={{ color: "var(--b-muted)" }}
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
              {pendingFiles.map((file) => (
                <li key={fileKey(file)}>
                  <div
                    className="lab-notes-file"
                    style={{ borderStyle: "dashed" }}
                  >
                    <span
                      className="min-w-0 truncate"
                      style={{ color: "var(--b-muted)" }}
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
                      className="flex size-6 shrink-0 items-center justify-center rounded-md disabled:opacity-40"
                      style={{ color: "var(--b-muted)" }}
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {mode === "edit" && initial?.id ? (
              <button
                type="button"
                className="b-btn b-btn-secondary"
                style={{ color: "var(--b-muted)" }}
                onClick={handleDelete}
                disabled={pending}
              >
                Löschen
              </button>
            ) : null}
            <button
              type="submit"
              className="b-btn b-btn-primary"
              disabled={pending || !canSave || dictationOpen}
              title={
                dictationOpen ? "Bitte Diktat zuerst übernehmen" : undefined
              }
            >
              {pending ? "Speichern…" : "Speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
