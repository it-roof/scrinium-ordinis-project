"use client";

import { useState } from "react";

import {
  exportLetterAction,
  updateLetterAction,
} from "@/lib/letters/actions";
import type { LetterRecord } from "@/lib/letters/types";

function downloadBase64(filename: string, mimeType: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: mimeType });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

export function LetterCard({
  letter,
  onLetterChange,
}: {
  letter: LetterRecord;
  onLetterChange: (letter: LetterRecord) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(letter.title);
  const [salutation, setSalutation] = useState(letter.salutation);
  const [body, setBody] = useState(letter.body);
  const [closing, setClosing] = useState(letter.closing);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function syncFrom(next: LetterRecord) {
    setTitle(next.title);
    setSalutation(next.salutation);
    setBody(next.body);
    setClosing(next.closing);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const result = await updateLetterAction(letter.id, {
      title,
      salutation,
      body,
      closing,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onLetterChange(result.data);
    syncFrom(result.data);
    setEditing(false);
  }

  async function exportFile(format: "pdf" | "docx") {
    if (exporting) return;
    setExporting(format);
    setError(null);
    const result = await exportLetterAction(letter.id, format);
    setExporting(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    downloadBase64(result.data.filename, result.data.mimeType, result.data.base64);
  }

  const preview = letter.body.trim() || letter.title;

  return (
    <div className="rounded-2xl border border-border bg-muted/50 p-4">
      <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
        Schreiben
      </p>
      <h3 className="mt-1 font-heading text-[1.05rem] font-medium tracking-tight">
        {letter.title || "Schreiben"}
      </h3>
      {letter.salutation ? (
        <p className="mt-3 text-[13.5px] text-muted-foreground">{letter.salutation}</p>
      ) : null}
      <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-[13.5px] leading-relaxed">
        {preview}
      </p>
      {letter.closing ? (
        <p className="mt-3 text-[13.5px] text-muted-foreground">{letter.closing}</p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            syncFrom(letter);
            setEditing(true);
            setError(null);
          }}
          className="inline-flex h-8 items-center rounded-full px-3 text-[13px] hover:bg-background"
        >
          Bearbeiten
        </button>
        <button
          type="button"
          disabled={Boolean(exporting)}
          onClick={() => {
            void exportFile("pdf");
          }}
          className="inline-flex h-8 items-center rounded-full px-3 text-[13px] hover:bg-background disabled:opacity-50"
        >
          {exporting === "pdf" ? "PDF…" : "PDF"}
        </button>
        <button
          type="button"
          disabled={Boolean(exporting)}
          onClick={() => {
            void exportFile("docx");
          }}
          className="inline-flex h-8 items-center rounded-full px-3 text-[13px] hover:bg-background disabled:opacity-50"
        >
          {exporting === "docx" ? "Word…" : "Word"}
        </button>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/20"
            aria-label="Schließen"
            onClick={() => setEditing(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="letter-edit-title"
            className="relative max-h-[90vh] w-full max-w-[32rem] overflow-y-auto rounded-2xl bg-card p-6 shadow-[var(--shadow-soft)]"
          >
            <h2
              id="letter-edit-title"
              className="font-heading text-lg font-medium tracking-tight"
            >
              Schreiben
            </h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-[12px] text-muted-foreground">
                Titel
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none"
                />
              </label>
              <label className="grid gap-1 text-[12px] text-muted-foreground">
                Anrede
                <input
                  value={salutation}
                  onChange={(event) => setSalutation(event.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none"
                />
              </label>
              <label className="grid gap-1 text-[12px] text-muted-foreground">
                Text
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={10}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                />
              </label>
              <label className="grid gap-1 text-[12px] text-muted-foreground">
                Schluss
                <input
                  value={closing}
                  onChange={(event) => setClosing(event.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none"
                />
              </label>
            </div>
            {error ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="h-10 rounded-full px-4 text-sm text-muted-foreground hover:text-foreground"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  void save();
                }}
                className="h-10 rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
              >
                {saving ? "Speichern…" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
