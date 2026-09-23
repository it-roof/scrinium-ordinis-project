"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  PaperclipIcon,
  PencilIcon,
  PrinterIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { deleteUserNote, exportUserNotePdf } from "@/lib/notes/actions";
import type { UserNote } from "@/lib/notes/types";

const NOTES_BASE = "/notizen";

function formatDetailDate(value: string) {
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function V1NoteDetailView({ note }: { note: UserNote }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const title = note.title.trim() || "Ohne Titel";

  function handleDelete() {
    if (!window.confirm(`„${title}“ dauerhaft löschen?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteUserNote(note.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Notiz gelöscht.");
      router.replace(NOTES_BASE);
      router.refresh();
    });
  }

  function handlePrint() {
    const popup = window.open("", "_blank");
    if (!popup) {
      toast.error(
        "Pop-up blockiert — bitte Pop-ups für diese Seite erlauben."
      );
      return;
    }

    startTransition(async () => {
      const result = await exportUserNotePdf(note.id);
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
    <div className="lab-notes relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pt-12 pb-14 md:px-10 md:pt-14">
        <Link
          href={NOTES_BASE}
          className="b-meta inline-flex w-fit items-center gap-1.5 transition-colors hover:text-[var(--b-ink)]"
        >
          <ArrowLeftIcon className="size-4" strokeWidth={1.75} />
          Zurück zur Übersicht
        </Link>

        <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="b-display b-title font-medium tracking-[-0.02em]">
              {title}
            </h1>
            <p className="b-meta mt-2">
              Geändert {formatDetailDate(note.updatedAt)}
            </p>
          </div>
          <div className="lab-notes-toolbar shrink-0">
            <button
              type="button"
              className="b-btn b-btn-secondary"
              onClick={handlePrint}
              disabled={pending}
            >
              <PrinterIcon className="size-3.5" strokeWidth={1.75} />
              Drucken
            </button>
            <Link
              href={`${NOTES_BASE}/${note.id}/bearbeiten`}
              className="b-btn b-btn-primary"
            >
              <PencilIcon className="size-3.5" strokeWidth={1.75} />
              Bearbeiten
            </Link>
            <button
              type="button"
              className="b-btn b-btn-secondary"
              style={{ color: "var(--b-muted)" }}
              onClick={handleDelete}
              disabled={pending}
            >
              <Trash2Icon className="size-3.5" strokeWidth={1.75} />
              Löschen
            </button>
          </div>
        </header>

        <div className="mt-10">
          {note.body.trim() ? (
            <p
              className="whitespace-pre-wrap text-[1.0625rem] leading-[1.65]"
              style={{ color: "var(--b-ink)" }}
            >
              {note.body}
            </p>
          ) : (
            <p className="b-meta">Kein Inhalt.</p>
          )}

          {note.files.length > 0 ? (
            <div className="mt-10 space-y-2.5">
              <p className="b-meta font-medium">Dokumente</p>
              <ul className="flex flex-wrap gap-2">
                {note.files.map((file) => (
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
                      <span className="min-w-0 truncate">{file.filename}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
