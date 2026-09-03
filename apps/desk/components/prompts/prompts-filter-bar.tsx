"use client";

import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Prompt } from "@/lib/prompts/types";

import {
  countUntaggedPrompts,
  getPromptTagOptions,
  UNTAGGED_PROMPT_FILTER,
  type PromptTagFilter,
} from "./use-prompt-list-filter";

export function PromptsFilterBar({
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
  const showTagFilters = items.length > 0;

  return (
    <div className="surface-panel space-y-4 p-4 md:p-5">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Suchen nach Titel, Tag oder Prompt-Text…"
          className="h-11 rounded-xl border-border/80 bg-background/80 pl-10 shadow-none"
        />
      </div>

      {showTagFilters ? (
        <div className="flex flex-wrap gap-2">
          <TagFilterPill
            active={tagFilter === "all"}
            onClick={() => onTagFilterChange("all")}
            label="Alle"
            count={items.length}
            activeClassName="bg-primary text-primary-foreground shadow-sm shadow-primary/20"
          />
          <TagFilterPill
            active={tagFilter === UNTAGGED_PROMPT_FILTER}
            onClick={() => onTagFilterChange(UNTAGGED_PROMPT_FILTER)}
            label="Ohne Tags"
            count={untaggedCount}
            activeClassName="bg-violet-600 text-white shadow-sm shadow-violet-600/20"
          />
          {tagOptions.map((tag) => (
            <TagFilterPill
              key={tag.key}
              active={tagFilter === tag.key}
              onClick={() => onTagFilterChange(tag.key)}
              label={tag.label}
              count={tag.count}
              activeClassName="bg-violet-600 text-white shadow-sm shadow-violet-600/20"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TagFilterPill({
  active,
  onClick,
  label,
  count,
  activeClassName,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  activeClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? activeClassName
          : "border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-xs",
          active ? "bg-white/20" : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}
