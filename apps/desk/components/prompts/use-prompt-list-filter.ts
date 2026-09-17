"use client";

import { useMemo } from "react";

import { tagKey } from "@/lib/prompts/tag-utils";
import { formatPromptNumber, type Prompt } from "@/lib/prompts/types";

export const UNTAGGED_PROMPT_FILTER = "__untagged__";

export type PromptTagFilter = string | "all";

export type PromptSortOrder = "number-asc" | "number-desc";

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
  tagFilter: PromptTagFilter,
  sortOrder: PromptSortOrder = "number-asc"
) {
  const tagOptions = useMemo(() => getPromptTagOptions(items), [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const numericQuery = /^\d+$/.test(query) ? Number.parseInt(query, 10) : null;

    function matchesNumberExactly(item: Prompt): boolean {
      if (numericQuery === null || !Number.isInteger(numericQuery)) {
        return false;
      }
      return (
        item.number === numericQuery ||
        formatPromptNumber(item.number) === query ||
        String(item.number) === query
      );
    }

    function matchesTitle(item: Prompt): boolean {
      return item.title.toLowerCase().includes(query);
    }

    function matchesBodyOrTags(item: Prompt): boolean {
      return (
        item.content.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.name.toLowerCase().includes(query))
      );
    }

    /** 0 = Nummer exakt, 1 = Titel, 2 = Text/Tags/Nummern-Teiltreffer */
    function searchRank(item: Prompt): number {
      if (!query) return 0;
      if (numericQuery !== null && Number.isInteger(numericQuery)) {
        if (matchesNumberExactly(item)) return 0;
        if (matchesTitle(item)) return 1;
        return 2;
      }
      if (matchesTitle(item)) return 1;
      return 2;
    }

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
          matchesNumberExactly(item) ||
          String(item.number).includes(query) ||
          formatPromptNumber(item.number).includes(query) ||
          matchesTitle(item) ||
          matchesBodyOrTags(item)
        );
      })
      .sort((left, right) => {
        if (query) {
          const byRank = searchRank(left) - searchRank(right);
          if (byRank !== 0) {
            return byRank;
          }
        }

        const byNumber =
          sortOrder === "number-asc"
            ? left.number - right.number
            : right.number - left.number;
        return byNumber || left.title.localeCompare(right.title, "de");
      });
  }, [items, search, tagFilter, sortOrder]);

  return { tagOptions, filteredItems };
}
