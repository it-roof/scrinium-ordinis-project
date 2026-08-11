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
import { DepartmentBadge } from "@/components/text-blocks/department-badge";
import {
  createTextBlock,
  deleteTextBlock,
  updateTextBlock,
} from "@/lib/text-blocks/actions";
import { departmentStyles } from "@/lib/text-blocks/department-styles";
import {
  DEPARTMENTS,
  type Department,
  type TextBlock,
} from "@/lib/text-blocks/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  title: string;
  content: string;
  department: Department;
};

const emptyForm: FormState = {
  title: "",
  content: "",
  department: "general",
};

type TextBlocksViewProps = {
  initialItems: TextBlock[];
};

export function TextBlocksView({ initialItems }: TextBlocksViewProps) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<Department | "all">(
    "all"
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TextBlock | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<TextBlock | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesDepartment =
        departmentFilter === "all" || item.department === departmentFilter;
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query);

      return matchesDepartment && matchesSearch;
    });
  }, [items, search, departmentFilter]);

  function openCreateDialog() {
    setEditingItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(item: TextBlock) {
    setEditingItem(item);
    setForm({
      title: item.title,
      content: item.content,
      department: item.department,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = editingItem
        ? await updateTextBlock(editingItem.id, form)
        : await createTextBlock(form);

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
        toast.success("Textbaustein aktualisiert.");
      } else {
        setItems((current) => [result.item, ...current]);
        toast.success("Textbaustein angelegt.");
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
      const result = await deleteTextBlock(target.id);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setItems((current) => current.filter((item) => item.id !== target.id));
      setDeleteTarget(null);
      toast.success("Textbaustein gelöscht.");
    });
  }

  async function copyContent(item: TextBlock) {
    try {
      await navigator.clipboard.writeText(item.content);
      toast.success("Inhalt in die Zwischenablage kopiert.");
    } catch {
      toast.error("Kopieren fehlgeschlagen.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <PageHeader
        eyebrow="Wissensbasis"
        title="Textbausteine"
        description="Wiederverwendbare Texte für Schreiben, E-Mails und Vorlagen — strukturiert nach Kanzlei-Bereichen."
      >
        <Button
          onClick={openCreateDialog}
          size="lg"
          className="px-5 shadow-sm shadow-primary/20"
        >
          <PlusIcon data-icon="inline-start" />
          Neuer Textbaustein
        </Button>
      </PageHeader>

      <div className="surface-panel space-y-4 p-4 md:p-5">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Suchen nach Titel oder Inhalt…"
            className="h-11 rounded-xl border-border/80 bg-background/80 pl-10 shadow-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterPill
            active={departmentFilter === "all"}
            onClick={() => setDepartmentFilter("all")}
            label="Alle"
            count={items.length}
            activeClassName="bg-primary text-primary-foreground shadow-sm shadow-primary/20"
          />
          {DEPARTMENTS.map((department) => {
            const count = items.filter(
              (item) => item.department === department.value
            ).length;
            const styles = departmentStyles[department.value];

            return (
              <FilterPill
                key={department.value}
                active={departmentFilter === department.value}
                onClick={() => setDepartmentFilter(department.value)}
                label={department.label}
                count={count}
                dotClassName={styles.dot}
                activeClassName={styles.pill}
              />
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          {filteredItems.length}{" "}
          {filteredItems.length === 1 ? "Textbaustein" : "Textbausteine"}
        </p>
      </div>

      {filteredItems.length === 0 ? (
        <Empty className="surface-card border-dashed py-16">
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="size-12 rounded-none bg-sky-100 text-sky-700"
            >
              <SearchIcon className="size-5" />
            </EmptyMedia>
            <EmptyTitle className="font-heading text-lg">
              {items.length === 0
                ? "Noch keine Textbausteine"
                : "Keine Treffer"}
            </EmptyTitle>
            <EmptyDescription className="max-w-sm text-sm leading-relaxed">
              {items.length === 0
                ? "Lege den ersten Textbaustein an, um wiederkehrende Formulierungen zentral zu verwalten."
                : "Passe Suche oder Bereichsfilter an."}
            </EmptyDescription>
          </EmptyHeader>
          {items.length === 0 && (
            <EmptyContent>
              <Button onClick={openCreateDialog} size="lg">
                <PlusIcon data-icon="inline-start" />
                Ersten Textbaustein anlegen
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
                "surface-card group overflow-hidden border-l-[3px] transition-shadow hover:shadow-[var(--shadow-elevated)]",
                departmentStyles[item.department].accent,
                departmentStyles[item.department].wash
              )}
            >
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="font-heading text-lg font-medium tracking-tight">
                      {item.title}
                    </h2>
                    <DepartmentBadge department={item.department} />
                  </div>
                  <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
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
          <div className="h-1 bg-gradient-to-r from-sky-400 via-teal-400 to-indigo-400" />
          <div className="border-b border-border/70 px-6 py-5">
            <DialogHeader className="text-left">
              <p className="text-[0.68rem] font-medium tracking-[0.16em] text-primary/70 uppercase">
                {editingItem ? "Bearbeiten" : "Neu anlegen"}
              </p>
              <DialogTitle className="font-heading text-xl font-medium">
                {editingItem ? "Textbaustein bearbeiten" : "Neuer Textbaustein"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                Titel, Bereich und Textinhalt für die spätere Wiederverwendung
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
                placeholder="z. B. Anschreiben Erstberatung"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="department">Bereich</Label>
              <Select
                value={form.department}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    department: value as Department,
                  }))
                }
              >
                <SelectTrigger id="department" className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((department) => (
                    <SelectItem key={department.value} value={department.value}>
                      {department.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">Inhalt</Label>
              <Textarea
                id="content"
                value={form.content}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                placeholder="Text des Bausteins…"
                className="min-h-52 rounded-xl"
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
              Textbaustein löschen?
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

function FilterPill({
  active,
  onClick,
  label,
  count,
  dotClassName,
  activeClassName = "bg-primary text-primary-foreground shadow-sm",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dotClassName?: string;
  activeClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm transition-all",
        active
          ? activeClassName
          : "bg-background/70 text-muted-foreground ring-1 ring-border/80 hover:bg-background hover:text-foreground"
      )}
    >
      {dotClassName ? (
        <span className={cn("size-1.5 rounded-full", dotClassName)} />
      ) : null}
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium",
          active
            ? "bg-primary-foreground/15 text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}
