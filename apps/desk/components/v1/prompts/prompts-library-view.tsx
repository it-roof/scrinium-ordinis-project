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
  type PromptTagFilter,
} from "@/components/prompts/use-prompt-list-filter";
import { V1PromptForm } from "@/components/v1/prompts/prompt-form";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/v1/ui/sheet";
import { deletePrompt } from "@/lib/prompts/actions";
import type { Prompt } from "@/lib/prompts/types";
import { cn } from "@/lib/utils";

const PROMPT_BASE = "/v1/prompt";

export type PromptLibraryMode = "ansehen" | "verwalten";

type V1PromptsLibraryViewProps = {
  initialItems: Prompt[];
  availableTags: string[];
  mode: PromptLibraryMode;
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
  availableTags,
  mode,
}: V1PromptsLibraryViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isManage = mode === "verwalten";
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<PromptTagFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [isPending, startTransition] = useTransition();
  const { filteredItems } = usePromptListFilter(items, search, tagFilter);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

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
      if (editing?.id === item.id) {
        setEditing(null);
      }
      toast.success("Prompt gelöscht.");
      router.refresh();
    });
  }

  function handleEditSuccess(prompt: Prompt) {
    setItems((current) =>
      current.map((row) => (row.id === prompt.id ? prompt : row))
    );
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="@container/main mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 md:px-6">
        <header className="flex flex-col gap-6 border-b border-border/15 pt-8 pb-6 sm:flex-row sm:items-end sm:justify-between md:pt-10 md:pb-8">
          <div className="min-w-0 space-y-3">
            <h1 className="font-heading text-3xl font-medium tracking-tight text-foreground md:text-[2.35rem] md:leading-[1.15]">
              Prompt-Bibliothek
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground md:text-[0.95rem]">
              {isManage
                ? "Prompts anlegen, bearbeiten und löschen."
                : "Prompts durchsuchen, lesen und mit einem Klick kopieren."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <ModeToggle mode={mode} onChange={setMode} />
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
                    ? "Lege den ersten Prompt an, um Formulierungen zentral zu speichern."
                    : "Passe die Suche oder den Tag-Filter an."}
                </CardDescription>
              </CardHeader>
              {items.length === 0 ? (
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
                      "transition-colors duration-200 hover:bg-muted/40",
                      editing?.id === item.id && "ring-1 ring-primary/20"
                    )}
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

                      <div className="flex shrink-0 flex-wrap items-center gap-1">
                        {!isManage ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-border/60 bg-background shadow-none"
                            onClick={() => copyContent(item)}
                          >
                            <CopyIcon />
                            Kopieren
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 border-border/60 bg-background shadow-none"
                              onClick={() => setEditing(item)}
                            >
                              <PencilIcon />
                              Bearbeiten
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
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Sheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full gap-0 p-0 sm:max-w-xl"
        >
          <SheetHeader className="border-b px-4 py-4 text-left">
            <SheetTitle className="font-heading text-lg font-medium tracking-tight">
              Prompt bearbeiten
            </SheetTitle>
            <SheetDescription>
              Titel, Tags und Prompt-Text speichern.
            </SheetDescription>
          </SheetHeader>
          {editing ? (
            <V1PromptForm
              key={editing.id}
              variant="panel"
              mode="edit"
              promptId={editing.id}
              availableTags={availableTags}
              initialValues={{
                title: editing.title,
                content: editing.content,
                tags: editing.tags.map((tag) => tag.name),
              }}
              onCancel={() => setEditing(null)}
              onSuccess={handleEditSuccess}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
