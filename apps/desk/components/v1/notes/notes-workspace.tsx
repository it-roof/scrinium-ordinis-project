"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { V1NoteForm } from "@/components/v1/notes/note-form";
import { Button } from "@/components/v1/ui/button";
import { Input } from "@/components/v1/ui/input";
import { deleteUserNote, exportUserNotePdf } from "@/lib/notes/actions";
import type { UserNote } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

const NOTES_BASE = "/v1/notizen";

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
    if (!window.confirm(`„${label}" dauerhaft löschen?`)) {
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
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-muted/15">
      <div
        className={cn(
          "flex min-h-0 w-full flex-col border-border/50 bg-background md:w-[20rem] md:shrink-0 md:border-r lg:w-[22rem]",
          showDetail ? "hidden md:flex" : "flex"
        )}
      >
        <div className="flex flex-col gap-2 border-b border-border/40 px-3 pt-3 pb-2.5">
          <div className="flex h-8 items-center justify-between gap-2">
            <h1 className="font-heading text-base font-medium tracking-tight">
              Notizen
            </h1>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 rounded-md"
              onClick={selectNew}
              aria-label="Neue Notiz"
              title="Neue Notiz"
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen…"
            aria-label="Notizen durchsuchen"
            className="h-8 rounded-md border-border/60 bg-muted/35 px-2.5 text-sm shadow-none"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-8">
              <p className="text-sm font-medium text-foreground">
                {items.length === 0 ? "Noch keine Notizen" : "Keine Treffer"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {items.length === 0
                  ? "Tippen Sie +, um die erste Notiz anzulegen."
                  : "Suche anpassen."}
              </p>
              {items.length === 0 ? (
                <Button
                  type="button"
                  className="mt-4 h-10 rounded-lg shadow-none"
                  onClick={selectNew}
                >
                  <PlusIcon className="size-4" />
                  Neue Notiz
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="py-1">
              {filtered.map((item) => {
                const heading = item.title.trim() || "Ohne Titel";
                const preview = item.body.trim();
                const isActive =
                  selection.kind === "note" && selection.id === item.id;

                return (
                  <li key={item.id} className="px-2">
                    <div
                      className={cn(
                        "group flex items-stretch rounded-lg",
                        isActive ? "bg-muted" : "hover:bg-muted/60"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => selectNote(item.id)}
                        className="min-w-0 flex-1 px-3 py-2.5 text-left"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {heading}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatListDate(item.updatedAt)}
                          </span>
                        </div>
                        {preview ? (
                          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                            {preview}
                          </p>
                        ) : null}
                        {item.files.length > 0 ? (
                          <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <PaperclipIcon className="size-3" aria-hidden />
                            {item.files.length}
                          </span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(item)}
                        disabled={pending}
                        aria-label={`„${heading}" löschen`}
                        title="Löschen"
                        className={cn(
                          "my-1 mr-1 flex size-8 shrink-0 items-center justify-center rounded-md",
                          "text-muted-foreground opacity-0 transition-opacity",
                          "hover:bg-destructive/10 hover:text-destructive",
                          "group-hover:opacity-100 focus-visible:opacity-100",
                          "disabled:pointer-events-none disabled:opacity-40",
                          isActive && "opacity-100"
                        )}
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div
        className={cn(
          "min-h-0 min-w-0 flex-1 flex-col bg-muted/15",
          showDetail ? "flex" : "hidden md:flex"
        )}
      >
        {showDetail ? (
          <>
            <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2 md:hidden">
              <button
                type="button"
                onClick={selectNone}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeftIcon className="size-4" />
                Notizen
              </button>
            </div>

            {selection.kind === "new" ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3 md:px-6">
                  <div className="min-w-0">
                    <p className="font-heading text-base font-medium tracking-tight">
                      Neue Notiz
                    </p>
                    <p className="text-xs text-muted-foreground">
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
                  <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3 md:px-6">
                    <div className="min-w-0">
                      <p className="font-heading text-base font-medium tracking-tight">
                        Bearbeiten
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {activeNote.title.trim() || "Ohne Titel"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0 rounded-lg border-border/70 bg-background shadow-none"
                      onClick={() => openView(activeNote.id)}
                    >
                      Ansehen
                    </Button>
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
                  <div className="flex items-start justify-between gap-3 border-b border-border/40 px-4 py-3 md:px-6">
                    <div className="min-w-0 space-y-0.5">
                      <h2 className="font-heading truncate text-base font-medium tracking-tight md:text-lg">
                        {activeNote.title.trim() || "Ohne Titel"}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Zuletzt geändert {formatDetailDate(activeNote.updatedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-lg border-border/70 bg-background shadow-none"
                        onClick={() => handlePrintNote(activeNote.id)}
                        disabled={pending}
                      >
                        <PrinterIcon className="size-3.5" />
                        Drucken
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 rounded-lg shadow-none"
                        onClick={() => openEdit(activeNote.id)}
                      >
                        <PencilIcon className="size-3.5" />
                        Bearbeiten
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeleteNote(activeNote)}
                        disabled={pending}
                      >
                        <Trash2Icon className="size-3.5" />
                        Löschen
                      </Button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
                    {activeNote.body.trim() ? (
                      <p className="whitespace-pre-wrap text-[0.95rem] leading-[1.6] text-foreground">
                        {activeNote.body}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Kein Inhalt.</p>
                    )}

                    {activeNote.files.length > 0 ? (
                      <div className="mt-6 space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Dokumente
                        </p>
                        <ul className="flex flex-wrap gap-2">
                          {activeNote.files.map((file) => (
                            <li key={file.id}>
                              <a
                                href={`/api/notes/files/${file.id}?download=1`}
                                title={file.filename}
                                className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-sm transition-colors hover:bg-muted/50"
                              >
                                <PaperclipIcon
                                  className="size-3.5 shrink-0 text-muted-foreground"
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
                <p className="text-sm text-muted-foreground">
                  Notiz nicht gefunden.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="font-heading text-lg font-medium tracking-tight">
              {items.length === 0 ? "Noch keine Notizen" : "Notiz wählen"}
            </p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {items.length === 0
                ? "Legen Sie links mit + die erste Notiz an."
                : "Wählen Sie links eine Notiz — oder legen Sie mit + eine neue an."}
            </p>
            {items.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                className="mt-1 h-10 rounded-lg shadow-none"
                onClick={selectNew}
              >
                <PlusIcon className="size-4" />
                Neue Notiz
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
