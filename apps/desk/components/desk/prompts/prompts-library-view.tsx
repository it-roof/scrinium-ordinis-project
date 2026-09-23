"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  usePromptListFilter,
  type PromptSortOrder,
  type PromptTagFilter,
} from "@/components/prompts/use-prompt-list-filter";
import { V1PromptsFilterBar } from "@/components/desk/prompts/prompts-filter-bar";
import { formatPromptNumber, type Prompt } from "@/lib/prompts/types";

const PROMPT_SORT_STORAGE_KEY = "scrinium.v1.prompt-sort-order";

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
            sortOrder={sortOrder}
            onSortOrderChange={changeSortOrder}
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
            <ul className="grid gap-3.5">
              {filteredItems.map((item) => {
                const isOpen = openId === item.id;
                return (
                  <li key={item.id}>
                    <article className="lab-function-card flex flex-col gap-4 border p-5 sm:flex-row sm:items-start sm:justify-between">
                      <button
                        type="button"
                        onClick={() => setOpenId(isOpen ? null : item.id)}
                        className="flex min-w-0 flex-1 gap-3 text-left sm:gap-4"
                      >
                        <span
                          className="b-display shrink-0 text-[1.125rem] font-medium tabular-nums tracking-[-0.01em]"
                          style={{ color: "var(--b-muted)" }}
                          aria-label={`Nummer ${formatPromptNumber(item.number)}`}
                        >
                          {formatPromptNumber(item.number)}
                        </span>
                        <span className="min-w-0 flex-1 space-y-2">
                          <span className="b-display block text-[1.125rem] font-medium leading-[1.25] tracking-[-0.01em]">
                            {item.title}
                          </span>
                          {item.tags.length > 0 ? (
                            <span className="flex flex-wrap gap-1.5">
                              {item.tags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className="lab-prompts-tag"
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </span>
                          ) : null}
                          {isOpen ? (
                            <pre
                              className="whitespace-pre-wrap font-mono text-[0.875rem] leading-relaxed"
                              style={{ color: "var(--b-ink)" }}
                            >
                              {item.content}
                            </pre>
                          ) : (
                            <span
                              className="line-clamp-2 block font-mono text-[0.875rem] leading-relaxed"
                              style={{ color: "var(--b-muted)" }}
                            >
                              {item.content}
                            </span>
                          )}
                          <span
                            className="inline-flex text-[0.875rem] font-semibold tracking-[0.01em]"
                            style={{ color: "var(--b-accent)" }}
                          >
                            {isOpen ? "Weniger" : "Mehr anzeigen"}
                          </span>
                        </span>
                      </button>

                      <button
                        type="button"
                        className="b-btn b-btn-secondary shrink-0 self-start"
                        onClick={() => copyContent(item)}
                      >
                        Kopieren
                      </button>
                    </article>
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
