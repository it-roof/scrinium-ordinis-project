"use client";

import Link from "next/link";
import { useState } from "react";
import { CopyIcon, SearchIcon, SquarePenIcon } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { PromptsFilterBar } from "@/components/prompts/prompts-filter-bar";
import {
  usePromptListFilter,
  type PromptTagFilter,
} from "@/components/prompts/use-prompt-list-filter";
import { useAreaBasePath } from "@/lib/area/use-area-path";
import type { Prompt } from "@/lib/prompts/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type PromptsWorkViewProps = {
  initialItems: Prompt[];
};

export function PromptsWorkView({ initialItems }: PromptsWorkViewProps) {
  const basePath = useAreaBasePath() ?? "";
  const promptBase = `${basePath}/prompt`;
  const [items] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<PromptTagFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const { filteredItems } = usePromptListFilter(items, search, tagFilter);

  async function copyContent(item: Prompt) {
    try {
      await navigator.clipboard.writeText(item.content);
      toast.success("Prompt in die Zwischenablage kopiert.");
    } catch {
      toast.error("Kopieren fehlgeschlagen.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <PageHeader
        title="Prompt-Bibliothek"
        description="Prompts durchsuchen, lesen und mit einem Klick kopieren."
      >
        <Button asChild variant="outline" size="lg" className="px-5">
          <Link href={`${promptBase}/verwalten`}>
            <SquarePenIcon data-icon="inline-start" />
            Verwalten
          </Link>
        </Button>
      </PageHeader>

      <PromptsFilterBar
        items={items}
        search={search}
        onSearchChange={setSearch}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
      />

      {filteredItems.length === 0 ? (
        <Empty className="surface-card border-dashed py-16">
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="size-12 rounded-none bg-violet-100 text-violet-700"
            >
              <SearchIcon className="size-5" />
            </EmptyMedia>
            <EmptyTitle className="font-heading text-lg">
              {items.length === 0 ? "Noch keine Prompts" : "Keine Treffer"}
            </EmptyTitle>
            <EmptyDescription className="max-w-sm text-sm leading-relaxed">
              {items.length === 0
                ? "Lege in der Verwaltung den ersten Prompt an."
                : "Passe die Suche oder den Tag-Filter an."}
            </EmptyDescription>
          </EmptyHeader>
          {items.length === 0 ? (
            <Button asChild size="lg">
              <Link href={`${promptBase}/verwalten`}>Zur Verwaltung</Link>
            </Button>
          ) : null}
        </Empty>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item) => {
            const isOpen = openId === item.id;
            return (
              <article
                key={item.id}
                className="surface-card overflow-hidden border-l-[3px] border-l-violet-400 bg-gradient-to-br from-violet-50/50 via-white to-white"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className="min-w-0 flex-1 space-y-2 text-left"
                  >
                    <h2 className="font-heading text-lg font-medium tracking-tight">
                      {item.title}
                    </h2>
                    {item.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            className="rounded-lg bg-violet-100/90 text-violet-900"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {isOpen ? (
                      <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/90">
                        {item.content}
                      </pre>
                    ) : (
                      <p className="line-clamp-2 font-mono text-sm leading-relaxed text-muted-foreground">
                        {item.content}
                      </p>
                    )}
                    <span className="text-sm font-medium text-violet-700">
                      {isOpen ? "Weniger anzeigen" : "Mehr anzeigen"}
                    </span>
                  </button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 bg-background/80"
                    onClick={() => copyContent(item)}
                  >
                    <CopyIcon data-icon="inline-start" />
                    Kopieren
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
