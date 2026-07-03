"use client";

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
import {
  createPrompt,
  deletePrompt,
  updatePrompt,
} from "@/lib/prompts/actions";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  title: string;
  content: string;
};

const emptyForm: FormState = {
  title: "",
  content: "",
};

type PromptsViewProps = {
  initialItems: Prompt[];
};

export function PromptsView({ initialItems }: PromptsViewProps) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Prompt | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Prompt | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      if (!query) return true;

      return (
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
      );
    });
  }, [items, search]);

  function openCreateDialog() {
    setEditingItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(item: Prompt) {
    setEditingItem(item);
    setForm({
      title: item.title,
      content: item.content,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = editingItem
        ? await updatePrompt(editingItem.id, form)
        : await createPrompt(form);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      if (editingItem) {
        setItems((current) =>
          current.map((item) =>
            item.id === editingItem.id ? result.item : item
          )
        );
        toast.success("Prompt aktualisiert.");
      } else {
        setItems((current) => [result.item, ...current]);
        toast.success("Prompt angelegt.");
      }

      setDialogOpen(false);
      setEditingItem(null);
      setForm(emptyForm);
    });
  }

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
        description="Gespeicherte Prompt-Texte für wiederkehrende Aufgaben — mit einem Klick kopieren."
      >
        <Button
          onClick={openCreateDialog}
          size="lg"
          className="px-5 shadow-sm shadow-primary/20"
        >
          <PlusIcon data-icon="inline-start" />
          Neuer Prompt
        </Button>
      </PageHeader>

      <div className="surface-panel p-4 md:p-5">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Suchen nach Titel oder Prompt-Text…"
            className="h-11 rounded-xl border-border/80 bg-background/80 pl-10 shadow-none"
          />
        </div>
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
                : "Passe die Suche an."}
            </EmptyDescription>
          </EmptyHeader>
          {items.length === 0 && (
            <EmptyContent>
              <Button onClick={openCreateDialog} size="lg">
                <PlusIcon data-icon="inline-start" />
                Ersten Prompt anlegen
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
                  <h2 className="font-heading text-lg font-medium tracking-tight">
                    {item.title}
                  </h2>
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
                    onClick={() => openEditDialog(item)}
                    aria-label="Bearbeiten"
                  >
                    <PencilIcon />
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingItem(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="overflow-hidden rounded-none border-border/80 p-0 sm:max-w-2xl">
          <div className="h-1 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
          <div className="border-b border-border/70 px-6 py-5">
            <DialogHeader className="text-left">
              <p className="text-[0.68rem] font-medium tracking-[0.16em] text-primary/70 uppercase">
                {editingItem ? "Bearbeiten" : "Neu anlegen"}
              </p>
              <DialogTitle className="font-heading text-xl font-medium">
                {editingItem ? "Prompt bearbeiten" : "Neuer Prompt"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                Titel und Prompt-Text für die spätere Wiederverwendung
                festlegen.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-5 px-6 py-5">
            <div className="grid gap-2">
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="z. B. E-Mail zusammenfassen"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">Prompt-Text</Label>
              <Textarea
                id="content"
                value={form.content}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                placeholder="Dein Prompt…"
                className="min-h-56 rounded-xl font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/70 bg-muted/30 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {editingItem ? "Speichern" : "Anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
