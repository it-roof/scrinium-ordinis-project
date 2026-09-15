"use client";

import { SearchIcon } from "lucide-react";

import { Input } from "@/components/v1/ui/input";
import { cn } from "@/lib/utils";
import type { Prompt } from "@/lib/prompts/types";
import {
  countUntaggedPrompts,
  getPromptTagOptions,
  UNTAGGED_PROMPT_FILTER,
  type PromptTagFilter,
} from "@/components/prompts/use-prompt-list-filter";

export function V1PromptsFilterBar({
  items,
  search,
  onSearchChange,
  tagFilter,
  onTagFilterChange,
}: {
  items: Prompt[];
  search: string;
  onSearchChange: (value: string) => void;
  tagFilter: PromptTagFilter;
  onTagFilterChange: (value: PromptTagFilter) => void;
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
        ];

  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Suchen…"
          className="h-10 border-border/70 bg-transparent shadow-none pl-9"
          aria-label="Prompts suchen"
        />
      </div>

      {filters.length > 0 ? (
        <div
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5"
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
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-transparent bg-muted font-medium text-foreground"
                    : "border-border/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <span>{filter.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                    active
                      ? "bg-background/80 text-muted-foreground"
                      : "bg-muted/80 text-muted-foreground/70"
                  )}
                >
                  {filter.count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
