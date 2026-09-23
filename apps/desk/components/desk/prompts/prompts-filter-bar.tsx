"use client";

import {
  ArrowDownWideNarrowIcon,
  ArrowUpNarrowWideIcon,
  SearchIcon,
} from "lucide-react";

import type { Prompt } from "@/lib/prompts/types";
import {
  countUntaggedPrompts,
  getPromptTagOptions,
  UNTAGGED_PROMPT_FILTER,
  type PromptSortOrder,
  type PromptTagFilter,
} from "@/components/prompts/use-prompt-list-filter";

export function V1PromptsFilterBar({
  items,
  search,
  onSearchChange,
  tagFilter,
  onTagFilterChange,
  sortOrder = "number-asc",
  onSortOrderChange,
}: {
  items: Prompt[];
  search: string;
  onSearchChange: (value: string) => void;
  tagFilter: PromptTagFilter;
  onTagFilterChange: (value: PromptTagFilter) => void;
  sortOrder?: PromptSortOrder;
  onSortOrderChange?: (value: PromptSortOrder) => void;
}) {
  const tagOptions = getPromptTagOptions(items);
  const untaggedCount = countUntaggedPrompts(items);
  const filters =
    items.length === 0
      ? []
      : [
          { key: "all" as const, label: "Alle", count: items.length },
          {
            key: UNTAGGED_PROMPT_FILTER,
            label: "Ohne Tags",
            count: untaggedCount,
          },
          ...tagOptions.map((tag) => ({
            key: tag.key,
            label: tag.label,
            count: tag.count,
          })),
        ].filter((filter) => filter.key === "all" || filter.count > 0);

  const numberAsc = sortOrder === "number-asc";

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
            style={{ color: "var(--b-muted)" }}
            strokeWidth={1.75}
          />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Suchen…"
            className="lab-prompts-search"
            aria-label="Prompts suchen"
          />
        </div>
        {onSortOrderChange ? (
          <button
            type="button"
            onClick={() =>
              onSortOrderChange(numberAsc ? "number-desc" : "number-asc")
            }
            className="lab-prompts-sort"
            title={
              numberAsc
                ? "Nach Nummer aufsteigend — Klick für absteigend"
                : "Nach Nummer absteigend — Klick für aufsteigend"
            }
            aria-label={
              numberAsc
                ? "Sortierung: Nummer aufsteigend"
                : "Sortierung: Nummer absteigend"
            }
          >
            {numberAsc ? (
              <ArrowUpNarrowWideIcon className="size-4" strokeWidth={1.75} />
            ) : (
              <ArrowDownWideNarrowIcon className="size-4" strokeWidth={1.75} />
            )}
            <span className="tabular-nums">Nr.</span>
          </button>
        ) : null}
      </div>

      {filters.length > 0 ? (
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Nach Tag filtern"
        >
          {filters.map((filter) => {
            const active = tagFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTagFilterChange(filter.key)}
                className="lab-prompts-chip"
                data-active={active ? "true" : "false"}
              >
                <span>{filter.label}</span>
                <span className="tabular-nums opacity-70">{filter.count}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
