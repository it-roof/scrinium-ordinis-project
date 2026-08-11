"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  CopyIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { deletePrompt } from "@/lib/prompts/actions";
import { tagKey } from "@/lib/prompts/tag-utils";
import type { Prompt } from "@/lib/prompts/types";
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
import { Input } from "@/components/ui/input";

type PromptsViewProps = {
  initialItems: Prompt[];
};

export function PromptsView({ initialItems }: PromptsViewProps) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | "all">("all");
  const [deleteTarget, setDeleteTarget] = useState<Prompt | null>(null);
  const [isPending, startTransition] = useTransition();

  const tagOptions = useMemo(() => {
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
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesTag =
        tagFilter === "all" ||
        item.tags.some((tag) => tagKey(tag.name) === tagFilter);

      if (!matchesTag) return false;

      if (!query) return true;

      return (
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.name.toLowerCase().includes(query))
      );
    });
  }, [items, search, tagFilter]);

  function handleDelete() {
    if (!deleteTarget) return;

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
        eyebrow="KI & Automatisierung"
        title="Prompt"
        description="Gespeicherte Prompt-Texte für wiederkehrende Aufgaben — mit Tags organisieren und mit einem Klick kopieren."
      >
        <Button
          asChild
          size="lg"
          className="px-5 shadow-sm shadow-primary/20"
        >
          <Link href="/prompt/neu">
            <PlusIcon data-icon="inline-start" />
            Neuer Prompt
          </Link>
        </Button>
      </PageHeader>

      <div className="surface-panel space-y-4 p-4 md:p-5">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Suchen nach Titel, Tag oder Prompt-Text…"
            className="h-11 rounded-xl border-border/80 bg-background/80 pl-10 shadow-none"
          />
        </div>

        {tagOptions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <TagFilterPill
              active={tagFilter === "all"}
              onClick={() => setTagFilter("all")}
              label="Alle"
              count={items.length}
              activeClassName="bg-primary text-primary-foreground shadow-sm shadow-primary/20"
            />
            {tagOptions.map((tag) => (
              <TagFilterPill
                key={tag.key}
                active={tagFilter === tag.key}
                onClick={() => setTagFilter(tag.key)}
                label={tag.label}
                count={tag.count}
                activeClassName="bg-violet-600 text-white shadow-sm shadow-violet-600/20"
              />
            ))}
          </div>
        )}
      </div>

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
          {items.length === 0 && (
            <EmptyContent>
              <Button asChild size="lg">
                <Link href="/prompt/neu">
                  <PlusIcon data-icon="inline-start" />
                  Ersten Prompt anlegen
                </Link>
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className={cn(
                "surface-card group overflow-hidden border-l-[3px] border-l-violet-400",
                "bg-gradient-to-br from-violet-50/50 via-white to-white",
                "transition-shadow hover:shadow-[var(--shadow-elevated)]"
              )}
            >
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="space-y-2">
                    <h2 className="font-heading text-lg font-medium tracking-tight">
                      {item.title}
                    </h2>
                    {item.tags.length > 0 && (
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
                    )}
                  </div>
                  <p className="line-clamp-4 whitespace-pre-wrap font-mono text-sm leading-relaxed text-muted-foreground">
                    {item.content}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1 sm:opacity-80 sm:transition-opacity group-hover:opacity-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-background/80"
                    onClick={() => copyContent(item)}
                  >
                    <CopyIcon data-icon="inline-start" />
                    Kopieren
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    asChild
                    aria-label="Bearbeiten"
                  >
                    <Link href={`/prompt/${item.id}/bearbeiten`}>
                      <PencilIcon />
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
          ))}
        </div>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
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

function TagFilterPill({
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
