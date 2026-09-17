"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  CopyIcon,
  PencilIcon,
  PlusIcon,
  Sparkles,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import {
  usePromptListFilter,
  type PromptSortOrder,
  type PromptTagFilter,
} from "@/components/prompts/use-prompt-list-filter";
import { V1PromptsFilterBar } from "@/components/v1/prompts/prompts-filter-bar";
import { Badge } from "@/components/v1/ui/badge";
import { Button } from "@/components/v1/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/v1/ui/card";
import { Input } from "@/components/v1/ui/input";
import { deletePrompt, updatePromptNumber } from "@/lib/prompts/actions";
import { formatPromptNumber, type Prompt } from "@/lib/prompts/types";
import { cn } from "@/lib/utils";

const PROMPT_BASE = "/v1/prompt";
const PROMPT_SORT_STORAGE_KEY = "scrinium.v1.prompt-sort-order";

export type PromptLibraryMode = "ansehen" | "verwalten";

type V1PromptsLibraryViewProps = {
  initialItems: Prompt[];
  mode: PromptLibraryMode;
  canManage?: boolean;
};

function ModeToggle({
  mode,
  onChange,
}: {
  mode: PromptLibraryMode;
  onChange: (next: PromptLibraryMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border/60 bg-muted/40 p-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange("ansehen")}
        className={cn(
          "h-8 rounded-md px-3 text-muted-foreground hover:text-foreground",
          mode === "ansehen" &&
            "bg-primary text-primary-foreground shadow-none hover:bg-primary hover:text-primary-foreground"
        )}
      >
        Ansehen
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange("verwalten")}
        className={cn(
          "h-8 rounded-md px-3 text-muted-foreground hover:text-foreground",
          mode === "verwalten" &&
            "bg-primary text-primary-foreground shadow-none hover:bg-primary hover:text-primary-foreground"
        )}
      >
        Verwalten
      </Button>
    </div>
  );
}

export function V1PromptsLibraryView({
  initialItems,
  mode,
  canManage = false,
}: V1PromptsLibraryViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isManage = canManage && mode === "verwalten";
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<PromptTagFilter>("all");
  const [sortOrder, setSortOrder] = useState<PromptSortOrder>("number-asc");
  const [openId, setOpenId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
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

  function setMode(next: PromptLibraryMode) {
    if (next === "verwalten") {
      router.push(`${pathname}?mode=verwalten`);
      return;
    }
    router.push(pathname);
  }

  async function copyContent(item: Prompt) {
    try {
      await navigator.clipboard.writeText(item.content);
      toast.success("Prompt in die Zwischenablage kopiert.");
    } catch {
      toast.error("Kopieren fehlgeschlagen.");
    }
  }

  function handleDelete(item: Prompt) {
    const confirmed = window.confirm(
      `„${item.title}" dauerhaft löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
    );
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deletePrompt(item.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setItems((current) => current.filter((row) => row.id !== item.id));
      toast.success("Prompt gelöscht.");
      router.refresh();
    });
  }

  function handleNumberCommit(item: Prompt, raw: string) {
    const parsed = Number.parseInt(raw.trim(), 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
      toast.error("Bitte eine ganze Zahl ab 1 angeben.");
      return;
    }
    if (parsed === item.number) {
      return;
    }

    startTransition(async () => {
      const result = await updatePromptNumber(item.id, parsed);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setItems((current) =>
        current.map((row) => (row.id === result.item.id ? result.item : row))
      );
      router.refresh();
    });
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="@container/main mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 md:px-6">
        <header className="flex flex-col gap-6 border-b border-border/15 pt-8 pb-6 sm:flex-row sm:items-end sm:justify-between md:pt-10 md:pb-8">
          <div className="min-w-0 space-y-3">
            <h1 className="font-heading text-3xl font-medium tracking-tight text-foreground md:text-[2.35rem] md:leading-[1.15]">
              Prompt-Bibliothek
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground md:text-[0.95rem]">
              {isManage
                ? "Gemeinsame Bibliothek für alle Kanzleien — anlegen, bearbeiten und löschen."
                : "Gemeinsame Bibliothek für alle Kanzleien — durchsuchen und kopieren."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canManage ? (
              <ModeToggle mode={mode} onChange={setMode} />
            ) : null}
            {isManage ? (
              <Button
                asChild
                size="sm"
                className="h-8 rounded-md px-3 shadow-none"
              >
                <Link href={`${PROMPT_BASE}/neu`}>
                  <PlusIcon />
                  Neuer Prompt
                </Link>
              </Button>
            ) : null}
          </div>
        </header>

        <div className="flex flex-col gap-6 py-6 md:gap-8 md:py-8">
          <div>
            <V1PromptsFilterBar
              items={items}
              search={search}
              onSearchChange={setSearch}
              tagFilter={tagFilter}
              onTagFilterChange={setTagFilter}
              sortOrder={sortOrder}
              onSortOrderChange={changeSortOrder}
            />
          </div>

          {filteredItems.length === 0 ? (
            <Card className="border-dashed border-border/80 bg-card shadow-none">
              <CardHeader className="items-center text-center">
                <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 ring-1 ring-violet-200/70">
                  <Sparkles className="size-5" />
                </div>
                <CardTitle className="font-heading text-lg font-medium tracking-tight">
                  {items.length === 0 ? "Noch keine Prompts" : "Keine Treffer"}
                </CardTitle>
                <CardDescription className="max-w-sm text-sm leading-relaxed">
                  {items.length === 0
                    ? canManage
                      ? "Legen Sie den ersten Prompt für die gemeinsame Bibliothek an."
                      : "Die gemeinsame Bibliothek ist noch leer."
                    : "Passe die Suche oder den Tag-Filter an."}
                </CardDescription>
              </CardHeader>
              {items.length === 0 && canManage ? (
                <CardContent className="flex justify-center">
                  <Button asChild size="sm">
                    <Link href={`${PROMPT_BASE}/neu`}>
                      <PlusIcon />
                      Ersten Prompt anlegen
                    </Link>
                  </Button>
                </CardContent>
              ) : null}
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredItems.map((item) => {
                const isOpen = openId === item.id;
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "gap-0 border-border/80 bg-card py-0 shadow-none",
                      "transition-colors duration-200 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                        {isManage ? (
                          <Input
                            id={`prompt-number-${item.id}`}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            defaultValue={formatPromptNumber(item.number)}
                            key={`${item.id}-${item.number}`}
                            disabled={isPending}
                            onBlur={(event) =>
                              handleNumberCommit(item, event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.currentTarget.blur();
                              }
                            }}
                            className={cn(
                              "h-auto w-12 shrink-0 border-0 bg-transparent p-0 shadow-none",
                              "font-heading text-lg font-medium tracking-tight tabular-nums text-foreground",
                              "focus-visible:border-0 focus-visible:ring-0"
                            )}
                            aria-label={`Nummer für ${item.title}`}
                          />
                        ) : (
                          <span
                            className="shrink-0 font-heading text-lg font-medium tracking-tight tabular-nums text-foreground"
                            aria-label={`Nummer ${formatPromptNumber(item.number)}`}
                          >
                            {formatPromptNumber(item.number)}
                          </span>
                        )}
                        {isManage ? (
                          <div className="min-w-0 flex-1 space-y-2">
                            <h2 className="font-heading text-lg font-medium tracking-tight">
                              {item.title}
                            </h2>
                            {item.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {item.tags.map((tag) => (
                                  <Badge
                                    key={tag.id}
                                    variant="secondary"
                                    className="rounded-full bg-violet-100/80 font-normal text-violet-800"
                                  >
                                    {tag.name}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : (
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
                                    className="rounded-full bg-violet-100/80 font-normal text-violet-800"
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
                            <span className="inline-flex text-sm font-medium text-violet-700/80">
                              {isOpen ? "Weniger anzeigen" : "Mehr anzeigen"}
                            </span>
                          </button>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-border/60 bg-background shadow-none"
                          onClick={() => copyContent(item)}
                        >
                          <CopyIcon />
                          Kopieren
                        </Button>
                        {isManage ? (
                          <>
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-8 border-border/60 bg-background shadow-none"
                            >
                              <Link href={`${PROMPT_BASE}/${item.id}/bearbeiten`}>
                                <PencilIcon />
                                Bearbeiten
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(item)}
                              disabled={isPending}
                              aria-label="Löschen"
                            >
                              <Trash2Icon />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
