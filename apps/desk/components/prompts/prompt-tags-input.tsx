"use client";

import { useMemo, useState } from "react";
import { XIcon } from "lucide-react";

import { normalizeTagList, normalizeTagName, tagBadgeClass, tagKey } from "@/lib/prompts/tag-utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PromptTagsInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  disabled?: boolean;
  /** UI-Bezeichnung Singular, z. B. „Tag“ oder „Kategorie“ */
  itemLabel?: string;
  /** Eine Farbe für alle Badges. */
  badgeClassName?: string;
  /** Farbe pro Tag-Name (überschreibt badgeClassName / Hash). */
  badgeClassForTag?: (name: string) => string;
};

export function PromptTagsInput({
  value,
  onChange,
  suggestions,
  disabled = false,
  itemLabel = "Tag",
  badgeClassName,
  badgeClassForTag,
}: PromptTagsInputProps) {
  const [draft, setDraft] = useState("");
  const itemLabelLower = itemLabel.toLowerCase();

  const availableSuggestions = useMemo(() => {
    const selected = new Set(value.map(tagKey));

    return suggestions.filter((suggestion) => !selected.has(tagKey(suggestion)));
  }, [suggestions, value]);

  const matchingSuggestions = useMemo(() => {
    const query = draft.trim().toLowerCase();

    if (!query) {
      return availableSuggestions.slice(0, 8);
    }

    return availableSuggestions
      .filter((suggestion) => suggestion.toLowerCase().includes(query))
      .slice(0, 8);
  }, [availableSuggestions, draft]);

  function badgeClass(name: string) {
    if (badgeClassForTag) return badgeClassForTag(name);
    if (badgeClassName) return badgeClassName;
    return tagBadgeClass(name);
  }

  function addTag(raw: string) {
    const next = normalizeTagList([...value, raw]);

    onChange(next);
    setDraft("");
  }

  function removeTag(name: string) {
    onChange(value.filter((tag) => tagKey(tag) !== tagKey(name)));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();

      if (draft.trim()) {
        addTag(draft);
      }

      return;
    }

    if (event.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-input bg-background px-3 py-2",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          disabled && "opacity-60"
        )}
      >
        {value.map((tag) => (
          <Badge
            key={tagKey(tag)}
            variant="secondary"
            className={cn("h-7 gap-1 rounded-lg px-2.5", badgeClass(tag))}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              disabled={disabled}
              className="rounded-sm opacity-70 transition-opacity hover:opacity-100"
              aria-label={`${itemLabel} ${tag} entfernen`}
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        ))}

        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (normalizeTagName(draft)) {
              addTag(draft);
            }
          }}
          disabled={disabled}
          placeholder={
            value.length === 0
              ? `${itemLabel} eingeben und Enter…`
              : `Weitere ${itemLabelLower} hinzufügen…`
          }
          className="h-8 min-w-[12rem] flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
      </div>

      {matchingSuggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
            Vorschläge
          </p>
          <div className="flex flex-wrap gap-2">
            {matchingSuggestions.map((suggestion) => (
              <button
                key={tagKey(suggestion)}
                type="button"
                disabled={disabled}
                onClick={() => addTag(suggestion)}
                className="rounded-full border border-border/80 bg-muted/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Enter oder Komma zum Hinzufügen. Vorhandene{" "}
        {itemLabel === "Kategorie" ? "Kategorien" : "Tags"} unten anklicken (bis
        zu 8 Vorschläge).
      </p>
    </div>
  );
}
