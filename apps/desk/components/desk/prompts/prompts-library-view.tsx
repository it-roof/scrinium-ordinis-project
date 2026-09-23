"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  usePromptListFilter,
  type PromptSortOrder,
  type PromptTagFilter,
} from "@/components/prompts/use-prompt-list-filter";
import { V1PromptsFilterBar } from "@/components/desk/prompts/prompts-filter-bar";
import { formatPromptNumber, type Prompt } from "@/lib/prompts/types";

const PROMPT_SORT_STORAGE_KEY = "scrinium.v1.prompt-sort-order";

/** Fließtext-Ausschnitt: Zeilenumbrüche zu Leerzeichen. */
function promptPreview(content: string): string {
  return content.replace(/\s+/g, " ").trim();
}

export function V1PromptsLibraryView({
  initialItems,
}: {
  initialItems: Prompt[];
}) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<PromptTagFilter>("all");
  const [sortOrder, setSortOrder] = useState<PromptSortOrder>("number-asc");
  const [openId, setOpenId] = useState<string | null>(null);
  const { filteredItems } = usePromptListFilter(
    items,
    search,
    tagFilter,
    sortOrder
  );

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PROMPT_SORT_STORAGE_KEY);
      if (stored === "number-asc" || stored === "number-desc") {
        setSortOrder(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  function changeSortOrder(next: PromptSortOrder) {
    setSortOrder(next);
    try {
      window.localStorage.setItem(PROMPT_SORT_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  async function copyContent(item: Prompt) {
    try {
      await navigator.clipboard.writeText(item.content);
      toast.success("Prompt in die Zwischenablage kopiert.");
    } catch {
      toast.error("Kopieren fehlgeschlagen.");
    }
  }

  return (
    <div className="lab-prompts relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pt-12 pb-14 md:px-10 md:pt-14">
        <header className="flex max-w-2xl flex-col">
          <h1 className="b-display b-title font-medium tracking-[-0.02em]">
            Prompt-Bibliothek
          </h1>
          <p className="b-lead mt-2 max-w-none text-[1.0625rem] leading-[1.55] md:mt-2.5">
            Gemeinsame Bibliothek — durchsuchen und kopieren.
          </p>
        </header>

        <div className="mt-10 flex flex-col gap-6">
          <V1PromptsFilterBar
            items={items}
            search={search}
            onSearchChange={setSearch}
            tagFilter={tagFilter}
            onTagFilterChange={setTagFilter}
          />

          {filteredItems.length === 0 ? (
            <div className="lab-function-card border px-6 py-12 text-center">
              <p className="b-display text-[1.125rem] font-medium tracking-[-0.01em]">
                {items.length === 0 ? "Noch keine Prompts" : "Keine Treffer"}
              </p>
              <p className="b-meta mx-auto mt-2 max-w-sm">
                {items.length === 0
                  ? "Die gemeinsame Bibliothek ist noch leer."
                  : "Suche oder Tag-Filter anpassen."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex justify-start">
                <button
                  type="button"
                  className="b-meta inline-flex items-center gap-1.5 transition-colors hover:text-[var(--b-ink)]"
                  style={{ color: "var(--b-muted)" }}
                  onClick={() =>
                    changeSortOrder(
                      sortOrder === "number-asc"
                        ? "number-desc"
                        : "number-asc"
                    )
                  }
                  aria-label={
                    sortOrder === "number-asc"
                      ? "Sortierung: aufsteigend nach Nummer — Klick für absteigend"
                      : "Sortierung: absteigend nach Nummer — Klick für aufsteigend"
                  }
                >
                  {sortOrder === "number-asc" ? (
                    <ArrowUpIcon className="size-3.5" strokeWidth={1.75} />
                  ) : (
                    <ArrowDownIcon className="size-3.5" strokeWidth={1.75} />
                  )}
                  {sortOrder === "number-asc"
                    ? "Aufsteigend nach Nummer"
                    : "Absteigend nach Nummer"}
                </button>
              </div>
            <ul className="grid gap-3.5">
              {filteredItems.map((item) => {
                const isOpen = openId === item.id;
                return (
                  <li key={item.id}>
                    <article className="lab-function-card min-w-0 border px-5 py-4 sm:px-6 sm:py-5">
                      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                        <span
                          className="b-display flex h-10 shrink-0 items-center text-[1.25rem] font-medium leading-none tabular-nums tracking-[-0.01em]"
                          style={{ color: "var(--b-muted)" }}
                          aria-label={`Nummer ${formatPromptNumber(item.number)}`}
                        >
                          {formatPromptNumber(item.number)}
                        </span>

                        <div className="flex min-w-0 flex-1 flex-col gap-3">
                          <div className="flex min-w-0 flex-col gap-1.5">
                            <div className="lab-prompts-row min-w-0">
                              <span className="b-display min-w-0 flex-1 truncate text-[1.25rem] font-medium leading-none tracking-[-0.01em]">
                                {item.title}
                              </span>
                              <button
                                type="button"
                                className="b-btn b-btn-secondary shrink-0 gap-1.5"
                                onClick={() => copyContent(item)}
                              >
                                <CopyIcon className="size-4" strokeWidth={1.75} />
                                Kopieren
                              </button>
                            </div>

                            {item.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {item.tags.map((tag) => (
                                  <span key={tag.id} className="lab-prompts-tag">
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex max-w-xl min-w-0 flex-col gap-1.5">
                            {isOpen ? (
                              <pre
                                className="min-w-0 whitespace-pre-wrap break-words font-mono text-[0.8125rem] leading-snug"
                                style={{ color: "var(--b-ink)" }}
                              >
                                {item.content}
                              </pre>
                            ) : (
                              <p
                                className="line-clamp-2 min-w-0 font-mono text-[0.8125rem] leading-snug break-words"
                                style={{ color: "var(--b-muted)" }}
                              >
                                {promptPreview(item.content)}
                              </p>
                            )}

                            <button
                              type="button"
                              className="self-start text-[0.875rem] font-semibold tracking-[0.01em]"
                              style={{ color: "var(--b-accent)" }}
                              onClick={() =>
                                setOpenId(isOpen ? null : item.id)
                              }
                            >
                              {isOpen ? "Weniger" : "Mehr anzeigen"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
