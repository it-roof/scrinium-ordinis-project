"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { V1NoteForm } from "@/components/desk/notes/note-form";
import { deleteUserNote, exportUserNotePdf } from "@/lib/notes/actions";
import type { UserNote } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

const NOTES_BASE = "/notizen";

type Selection =
  | { kind: "none" }
  | { kind: "new" }
  | { kind: "note"; id: string };

type PaneMode = "view" | "edit";

function formatListDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatDetailDate(value: string) {
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function selectionFromProps(
  selectedId: string | null,
  mode: "list" | "new" | "view" | "edit"
): Selection {
  if (mode === "new") return { kind: "new" };
  if (selectedId) return { kind: "note", id: selectedId };
  return { kind: "none" };
}

type Props = {
  initialItems: UserNote[];
  selectedId?: string | null;
  mode?: "list" | "new" | "view" | "edit";
};

export function V1NotesWorkspace({
  initialItems,
  selectedId = null,
  mode = "list",
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const selection = selectionFromProps(selectedId, mode);
  const showDetail = selection.kind !== "none";
  const paneMode: PaneMode =
    mode === "edit" || mode === "new" ? "edit" : "view";

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.body.toLowerCase().includes(query)
    );
  }, [items, search]);

  const activeNote =
    selection.kind === "note"
      ? (items.find((item) => item.id === selection.id) ?? null)
      : null;

  function selectNote(id: string) {
    router.push(`${NOTES_BASE}/${id}`);
  }

  function selectNew() {
    router.push(`${NOTES_BASE}/neu`);
  }

  function selectNone() {
    router.push(NOTES_BASE);
  }

  function openEdit(id: string) {
    router.push(`${NOTES_BASE}/${id}/bearbeiten`);
  }

  function openView(id: string) {
    router.push(`${NOTES_BASE}/${id}`);
  }

  function handleSaved(note: UserNote) {
    setItems((current) => {
      const exists = current.some((row) => row.id === note.id);
      if (exists) {
        return current
          .map((row) => (row.id === note.id ? note : row))
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
      }
      return [note, ...current];
    });
    router.replace(`${NOTES_BASE}/${note.id}`);
    router.refresh();
  }

  function handleDeleted(id: string) {
    setItems((current) => current.filter((row) => row.id !== id));
    router.replace(NOTES_BASE);
    router.refresh();
  }

  function handleDeleteNote(item: UserNote) {
    const label = item.title.trim() || "diese Notiz";
    if (!window.confirm(`„${label}“ dauerhaft löschen?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteUserNote(item.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setItems((current) => current.filter((row) => row.id !== item.id));
      toast.success("Notiz gelöscht.");
      if (selection.kind === "note" && selection.id === item.id) {
        router.replace(NOTES_BASE);
      }
      router.refresh();
    });
  }

  function handlePrintNote(id: string) {
    const popup = window.open("", "_blank");
    if (!popup) {
      toast.error(
        "Pop-up blockiert — bitte Pop-ups für diese Seite erlauben."
      );
      return;
    }

    startTransition(async () => {
      const result = await exportUserNotePdf(id);
      if (!result.success) {
        popup.close();
        toast.error(result.error);
        return;
      }

      const bytes = Uint8Array.from(atob(result.base64), (character) =>
        character.charCodeAt(0)
      );
      const blob = new Blob([bytes], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      popup.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success("PDF geöffnet.");
    });
  }

  return (
    <div className="lab-notes relative flex min-h-0 flex-1 overflow-hidden">
      {/* Liste */}
      <div
        className={cn(
          "lab-notes-pane flex min-h-0 w-full flex-col border-r md:w-[20rem] md:shrink-0 lg:w-[22rem]",
          showDetail ? "hidden md:flex" : "flex"
        )}
      >
        <div className="flex flex-col gap-3 border-b px-4 pt-5 pb-4 md:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="b-display text-[1.25rem] font-medium tracking-[-0.02em]">
                Notizen
              </h1>
              <p className="b-meta mt-0.5">Nur für Sie sichtbar</p>
            </div>
            <button
              type="button"
              className="b-btn b-btn-primary shrink-0 gap-1.5 !min-h-10 !px-3.5 text-[0.8125rem]"
              onClick={selectNew}
            >
              <PlusIcon className="size-4" strokeWidth={1.75} />
              Neu
            </button>
          </div>
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
              style={{ color: "var(--b-muted)" }}
              strokeWidth={1.75}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen…"
              aria-label="Notizen durchsuchen"
              className="lab-notes-search"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 md:px-2.5">
          {filtered.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <p className="b-display text-[1.0625rem] font-medium tracking-[-0.01em]">
                {items.length === 0 ? "Noch keine Notizen" : "Keine Treffer"}
              </p>
              <p className="b-meta mx-auto mt-1.5 max-w-[16rem]">
                {items.length === 0
                  ? "Legen Sie Ihre erste Notiz an."
                  : "Suche anpassen."}
              </p>
              {items.length === 0 ? (
                <button
                  type="button"
                  className="b-btn b-btn-primary mx-auto mt-5 gap-1.5"
                  onClick={selectNew}
                >
                  <PlusIcon className="size-4" strokeWidth={1.75} />
                  Neue Notiz
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {filtered.map((item) => {
                const heading = item.title.trim() || "Ohne Titel";
                const preview = item.body.trim();
                const isActive =
                  selection.kind === "note" && selection.id === item.id;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => selectNote(item.id)}
                      className="lab-notes-item"
                      data-active={isActive ? "true" : "false"}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="b-display min-w-0 truncate text-[0.9375rem] font-medium tracking-[-0.01em]">
                          {heading}
                        </span>
                        <span className="b-meta shrink-0 tabular-nums">
                          {formatListDate(item.updatedAt)}
                        </span>
                      </div>
                      {preview ? (
                        <p
                          className="line-clamp-2 text-[0.8125rem] leading-snug"
                          style={{ color: "var(--b-muted)" }}
                        >
                          {preview}
                        </p>
                      ) : null}
                      {item.files.length > 0 ? (
                        <span
                          className="mt-0.5 inline-flex items-center gap-1 text-[0.6875rem]"
                          style={{ color: "var(--b-faint)" }}
                        >
                          <PaperclipIcon className="size-3" aria-hidden />
                          {item.files.length === 1
                            ? "1 Anhang"
                            : `${item.files.length} Anhänge`}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Detail */}
      <div
        className={cn(
          "lab-notes-detail min-h-0 min-w-0 flex-1 flex-col",
          showDetail ? "flex" : "hidden md:flex"
        )}
      >
        {showDetail ? (
          <>
            <div className="flex items-center gap-2 border-b px-4 py-3 md:hidden">
              <button
                type="button"
                onClick={selectNone}
                className="b-meta inline-flex items-center gap-1.5 transition-colors hover:text-[var(--b-ink)]"
              >
                <ArrowLeftIcon className="size-4" strokeWidth={1.75} />
                Übersicht
              </button>
            </div>

            {selection.kind === "new" ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b px-4 py-4 md:px-6">
                  <div className="min-w-0">
                    <p className="b-display text-[1.125rem] font-medium tracking-[-0.01em]">
                      Neue Notiz
                    </p>
                    <p className="b-meta mt-0.5">
                      Tippen, diktieren oder Dokument anhängen
                    </p>
                  </div>
                </div>
                <V1NoteForm
                  key="new"
                  mode="create"
                  embedded
                  onSaved={handleSaved}
                />
              </>
            ) : activeNote ? (
              paneMode === "edit" ? (
                <>
                  <div className="flex items-center justify-between gap-3 border-b px-4 py-4 md:px-6">
                    <div className="min-w-0">
                      <p className="b-display text-[1.125rem] font-medium tracking-[-0.01em]">
                        Bearbeiten
                      </p>
                      <p className="b-meta mt-0.5 truncate">
                        {activeNote.title.trim() || "Ohne Titel"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="b-btn b-btn-secondary shrink-0 !min-h-10 !px-3.5 text-[0.8125rem]"
                      onClick={() => openView(activeNote.id)}
                    >
                      Abbrechen
                    </button>
                  </div>
                  <V1NoteForm
                    key={`edit-${activeNote.id}`}
                    mode="edit"
                    initial={activeNote}
                    embedded
                    onSaved={handleSaved}
                    onDeleted={handleDeleted}
                  />
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-start md:justify-between md:px-6">
                    <div className="min-w-0">
                      <h2 className="b-display text-[1.25rem] font-medium tracking-[-0.015em] md:text-[1.375rem]">
                        {activeNote.title.trim() || "Ohne Titel"}
                      </h2>
                      <p className="b-meta mt-1">
                        Geändert {formatDetailDate(activeNote.updatedAt)}
                      </p>
                    </div>
                    <div className="lab-notes-toolbar shrink-0">
                      <button
                        type="button"
                        className="b-btn b-btn-secondary"
                        onClick={() => handlePrintNote(activeNote.id)}
                        disabled={pending}
                      >
                        <PrinterIcon className="size-3.5" strokeWidth={1.75} />
                        Drucken
                      </button>
                      <button
                        type="button"
                        className="b-btn b-btn-primary"
                        onClick={() => openEdit(activeNote.id)}
                      >
                        <PencilIcon className="size-3.5" strokeWidth={1.75} />
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        className="b-btn b-btn-secondary"
                        style={{ color: "var(--b-muted)" }}
                        onClick={() => handleDeleteNote(activeNote)}
                        disabled={pending}
                      >
                        <Trash2Icon className="size-3.5" strokeWidth={1.75} />
                        Löschen
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
                    {activeNote.body.trim() ? (
                      <p
                        className="max-w-2xl whitespace-pre-wrap text-[0.95rem] leading-[1.65]"
                        style={{ color: "var(--b-ink)" }}
                      >
                        {activeNote.body}
                      </p>
                    ) : (
                      <p className="b-meta">Kein Inhalt.</p>
                    )}

                    {activeNote.files.length > 0 ? (
                      <div className="mt-8 space-y-2.5">
                        <p className="b-meta font-medium">Dokumente</p>
                        <ul className="flex flex-wrap gap-2">
                          {activeNote.files.map((file) => (
                            <li key={file.id}>
                              <a
                                href={`/api/notes/files/${file.id}?download=1`}
                                title={file.filename}
                                className="lab-notes-file"
                              >
                                <PaperclipIcon
                                  className="size-3.5 shrink-0"
                                  style={{ color: "var(--b-muted)" }}
                                  aria-hidden
                                />
                                <span className="min-w-0 truncate">
                                  {file.filename}
                                </span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </>
              )
            ) : (
              <div className="flex flex-1 items-center justify-center px-6">
                <p className="b-meta">Notiz nicht gefunden.</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="b-display text-[1.25rem] font-medium tracking-[-0.015em]">
              {items.length === 0 ? "Noch keine Notizen" : "Notiz wählen"}
            </p>
            <p className="b-meta max-w-xs">
              {items.length === 0
                ? "Legen Sie links eine neue Notiz an."
                : "Wählen Sie links eine Notiz — oder legen Sie eine neue an."}
            </p>
            <button
              type="button"
              className="b-btn b-btn-primary mt-3 gap-1.5"
              onClick={selectNew}
            >
              <PlusIcon className="size-4" strokeWidth={1.75} />
              Neue Notiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
