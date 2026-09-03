"use client";

import { useMemo } from "react";

import { tagKey } from "@/lib/prompts/tag-utils";
import type { Prompt } from "@/lib/prompts/types";

export const UNTAGGED_PROMPT_FILTER = "__untagged__";

export type PromptTagFilter = string | "all";

export function countUntaggedPrompts(items: Prompt[]) {
  return items.filter((item) => item.tags.length === 0).length;
}

export function getPromptTagOptions(items: Prompt[]) {
  const counts = new Map<string, number>();

  for (const item of items) {
    for (const tag of item.tags) {
      const key = tagKey(tag.name);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([key, count]) => {
      const label =
        items
          .flatMap((item) => item.tags)
          .find((tag) => tagKey(tag.name) === key)?.name ?? key;

      return { key, label, count };
    })
    .sort((left, right) => left.label.localeCompare(right.label, "de"));
}

export function usePromptListFilter(
  items: Prompt[],
  search: string,
  tagFilter: PromptTagFilter
) {
  const tagOptions = useMemo(() => getPromptTagOptions(items), [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items
      .filter((item) => {
        const matchesTag =
          tagFilter === "all"
            ? true
            : tagFilter === UNTAGGED_PROMPT_FILTER
              ? item.tags.length === 0
              : item.tags.some((tag) => tagKey(tag.name) === tagFilter);

        if (!matchesTag) {
          return false;
        }

        if (!query) {
          return true;
        }

        return (
          item.title.toLowerCase().includes(query) ||
          item.content.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.name.toLowerCase().includes(query))
        );
      })
      .sort((left, right) => left.title.localeCompare(right.title, "de"));
  }, [items, search, tagFilter]);

  return { tagOptions, filteredItems };
}
