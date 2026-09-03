"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowLeftIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { PromptTagsCatalog } from "@/components/prompts/prompt-tags-catalog";
import { PromptsFilterBar } from "@/components/prompts/prompts-filter-bar";
import {
  usePromptListFilter,
  type PromptTagFilter,
} from "@/components/prompts/use-prompt-list-filter";
import { deletePrompt } from "@/lib/prompts/actions";
import { useAreaBasePath } from "@/lib/area/use-area-path";
import type { Prompt, PromptTagWithCount } from "@/lib/prompts/types";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type PromptsManageViewProps = {
  initialItems: Prompt[];
  initialTags: PromptTagWithCount[];
};

export function PromptsManageView({
  initialItems,
  initialTags,
}: PromptsManageViewProps) {
  const router = useRouter();
  const basePath = useAreaBasePath() ?? "";
  const promptBase = `${basePath}/prompt`;
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<PromptTagFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<Prompt | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { filteredItems } = usePromptListFilter(items, search, tagFilter);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  function applyTagRename(change: {
    fromId: string;
    toId: string;
    name: string;
    merged: boolean;
  }) {
    setItems((current) =>
      current.map((item) => {
        const hasFrom = item.tags.some((tag) => tag.id === change.fromId);
        if (!hasFrom) {
          return item;
        }

        const nextTags = item.tags
          .filter((tag) => tag.id !== change.fromId)
          .map((tag) =>
            tag.id === change.toId ? { ...tag, name: change.name } : tag
          );

        if (!nextTags.some((tag) => tag.id === change.toId)) {
          nextTags.push({ id: change.toId, name: change.name });
          nextTags.sort((left, right) =>
            left.name.localeCompare(right.name, "de")
          );
        }

        return { ...item, tags: nextTags };
      })
    );
    router.refresh();
  }

  function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    const target = deleteTarget;

    startTransition(async () => {
      const result = await deletePrompt(target.id);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setItems((current) => current.filter((item) => item.id !== target.id));
      setDeleteTarget(null);
      toast.success("Prompt gelöscht.");
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-fit px-0 text-muted-foreground hover:text-foreground"
      >
        <Link href={promptBase}>
          <ArrowLeftIcon data-icon="inline-start" />
          Zur Bibliothek
        </Link>
      </Button>

      <PageHeader
        title="Prompt-Bibliothek verwalten"
        description="Prompts anlegen, bearbeiten, taggen und löschen."
      >
        <Button
          asChild
          size="lg"
          className="px-5 shadow-sm shadow-primary/20"
        >
          <Link href={`${promptBase}/neu`}>
            <PlusIcon data-icon="inline-start" />
            Neuer Prompt
          </Link>
        </Button>
      </PageHeader>

      <PromptTagsCatalog
        initialTags={initialTags}
        onRenamed={applyTagRename}
      />

      <PromptsFilterBar
        items={items}
        search={search}
        onSearchChange={setSearch}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
      />

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          {filteredItems.length}{" "}
          {filteredItems.length === 1 ? "Prompt" : "Prompts"}
        </p>
      </div>

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
                ? "Lege den ersten Prompt an, um Formulierungen für KI-Tools zentral zu speichern."
                : "Passe die Suche oder den Tag-Filter an."}
            </EmptyDescription>
          </EmptyHeader>
          {items.length === 0 ? (
            <EmptyContent>
              <Button asChild size="lg">
                <Link href={`${promptBase}/neu`}>
                  <PlusIcon data-icon="inline-start" />
                  Ersten Prompt anlegen
                </Link>
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item) => {
            const isOpen = openId === item.id;
            return (
              <article
                key={item.id}
                className={cn(
                  "surface-card group overflow-hidden border-l-[3px] border-l-violet-400",
                  "bg-gradient-to-br from-violet-50/50 via-white to-white",
                  "transition-shadow hover:shadow-[var(--shadow-elevated)]"
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

                  <div className="flex shrink-0 items-center gap-1 sm:opacity-80 sm:transition-opacity group-hover:opacity-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-background/80"
                      asChild
                    >
                      <Link href={`${promptBase}/${item.id}/bearbeiten`}>
                        <PencilIcon data-icon="inline-start" />
                        Bearbeiten
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(item)}
                      aria-label="Löschen"
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">
              Prompt löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              „{deleteTarget?.title}" wird dauerhaft entfernt. Diese Aktion kann
              nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
