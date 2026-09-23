"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PaperclipIcon, PlusIcon, SearchIcon } from "lucide-react";

import type { UserNote } from "@/lib/notes/types";

const NOTES_BASE = "/notizen";

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

function notePreview(body: string): string {
  return body.replace(/\s+/g, " ").trim();
}

export function V1NotesListView({
  initialItems,
}: {
  initialItems: UserNote[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");

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

  return (
    <div className="lab-notes relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pt-12 pb-14 md:px-10 md:pt-14">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="b-display b-title font-medium tracking-[-0.02em]">
              Notizen
            </h1>
            <p className="b-lead mt-2 max-w-none text-[1.0625rem] leading-[1.55] md:mt-2.5">
              Persönlich — nur für Sie sichtbar.
            </p>
          </div>
          <button
            type="button"
            className="b-btn b-btn-primary shrink-0 gap-1.5 self-start sm:self-auto"
            onClick={() => router.push(`${NOTES_BASE}/neu`)}
          >
            <PlusIcon className="size-4" strokeWidth={1.75} />
            Neue Notiz
          </button>
        </header>

        <div className="mt-10 flex flex-col gap-6">
          <div className="relative max-w-xl">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
              style={{ color: "var(--b-muted)" }}
              strokeWidth={1.75}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Suchen…"
              aria-label="Notizen durchsuchen"
              className="lab-prompts-search"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="lab-function-card border px-6 py-12 text-center">
              <p className="b-display text-[1.125rem] font-medium tracking-[-0.01em]">
                {items.length === 0 ? "Noch keine Notizen" : "Keine Treffer"}
              </p>
              <p className="b-meta mx-auto mt-2 max-w-sm">
                {items.length === 0
                  ? "Legen Sie Ihre erste Notiz an."
                  : "Suche anpassen."}
              </p>
              {items.length === 0 ? (
                <button
                  type="button"
                  className="b-btn b-btn-primary mx-auto mt-6 gap-1.5"
                  onClick={() => router.push(`${NOTES_BASE}/neu`)}
                >
                  <PlusIcon className="size-4" strokeWidth={1.75} />
                  Neue Notiz
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="grid gap-3.5">
              {filtered.map((item) => {
                const heading = item.title.trim() || "Ohne Titel";
                const preview = notePreview(item.body);

                return (
                  <li key={item.id}>
                    <Link
                      href={`${NOTES_BASE}/${item.id}`}
                      className="lab-function-card flex min-w-0 flex-col gap-1.5 border px-5 py-4 transition-colors sm:px-6 sm:py-5"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="b-display min-w-0 truncate text-[1.125rem] font-medium tracking-[-0.01em]">
                          {heading}
                        </span>
                        <span className="b-meta shrink-0 tabular-nums">
                          {formatListDate(item.updatedAt)}
                        </span>
                      </div>
                      {preview ? (
                        <p
                          className="line-clamp-2 max-w-2xl text-[0.875rem] leading-snug"
                          style={{ color: "var(--b-muted)" }}
                        >
                          {preview}
                        </p>
                      ) : null}
                      {item.files.length > 0 ? (
                        <span
                          className="mt-0.5 inline-flex items-center gap-1 text-[0.75rem]"
                          style={{ color: "var(--b-faint)" }}
                        >
                          <PaperclipIcon className="size-3.5" aria-hidden />
                          {item.files.length === 1
                            ? "1 Anhang"
                            : `${item.files.length} Anhänge`}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
