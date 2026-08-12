"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  DownloadIcon,
  FileIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import {
  addTemplateFiles,
  createTemplate,
  deleteTemplate,
  deleteTemplateFile,
  updateTemplateMeta,
} from "@/lib/templates/actions";
import {
  formatFileSize,
  type Template,
} from "@/lib/templates/types";
import type { ContentModule } from "@/lib/db/schema";
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

type TemplatesViewProps = {
  initialItems: Template[];
  module: ContentModule;
};

export function TemplatesView({ initialItems, module }: TemplatesViewProps) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.files.some((file) => file.filename.toLowerCase().includes(query))
    );
  }, [items, search]);

  function upsertItem(template: Template) {
    setItems((current) => {
      const without = current.filter((entry) => entry.id !== template.id);
      return [template, ...without].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      );
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <PageHeader
        title="Vorlagen"
        description="Vollmachten, Fragebögen und weitere Dateien zum Herunterladen."
      >
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          Neue Vorlage
        </Button>
      </PageHeader>

      <div className="relative max-w-md">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Vorlagen durchsuchen…"
          className="h-11 rounded-xl pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileIcon />
            </EmptyMedia>
            <EmptyTitle>
              {items.length === 0 ? "Noch keine Vorlagen" : "Keine Treffer"}
            </EmptyTitle>
            <EmptyDescription>
              {items.length === 0
                ? "Lege die erste Vorlage an — z. B. Vollmacht oder Mandanten-Fragebogen."
                : "Passe die Suche an."}
            </EmptyDescription>
          </EmptyHeader>
          {items.length === 0 && (
            <EmptyContent>
              <Button onClick={() => setCreateOpen(true)} size="lg">
                <PlusIcon data-icon="inline-start" />
                Erste Vorlage anlegen
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="grid gap-4">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="surface-card overflow-hidden border-l-[3px] border-l-lime-400"
            >
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="space-y-1">
                    <h2 className="font-heading text-lg font-medium tracking-tight">
                      {item.title}
                    </h2>
                    {item.description ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                  </div>

                  <ul className="space-y-2">
                    {item.files.map((file) => (
                      <li
                        key={file.id}
                        className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm"
                      >
                        <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {file.filename}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.sizeBytes)}
                        </span>
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={`/api/templates/files/${file.id}`}
                            download={file.filename}
                          >
                            <DownloadIcon data-icon="inline-start" />
                            Download
                          </a>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(item)}
                  >
                    <PencilIcon data-icon="inline-start" />
                    Bearbeiten
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2Icon />
                    <span className="sr-only">Löschen</span>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <CreateTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        module={module}
        isPending={isPending}
        onSubmit={(formData) => {
          startTransition(async () => {
            const result = await createTemplate(formData);
            if (!result.success) {
              toast.error(result.error);
              return;
            }
            upsertItem(result.template);
            setCreateOpen(false);
            toast.success("Vorlage angelegt.");
          });
        }}
      />

      {editing ? (
        <EditTemplateDialog
          key={editing.updatedAt}
          template={editing}
          open={Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          isPending={isPending}
          onUpdated={(template) => {
            upsertItem(template);
            setEditing(template);
          }}
          onClose={() => setEditing(null)}
          startTransition={startTransition}
        />
      ) : null}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vorlage löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{deleteTarget?.title}“ und alle zugehörigen Dateien werden
              unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={() => {
                if (!deleteTarget) return;
                startTransition(async () => {
                  const result = await deleteTemplate(deleteTarget.id);
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  setItems((current) =>
                    current.filter((entry) => entry.id !== deleteTarget.id)
                  );
                  setDeleteTarget(null);
                  toast.success("Vorlage gelöscht.");
                });
              }}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateTemplateDialog({
  open,
  onOpenChange,
  module,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: ContentModule;
  isPending: boolean;
  onSubmit: (formData: FormData) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Neue Vorlage</DialogTitle>
          <DialogDescription>
            Titel, optional Kurzbeschreibung und eine oder mehrere Dateien.
          </DialogDescription>
        </DialogHeader>
        <form
          ref={formRef}
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            formData.set("module", module);
            onSubmit(formData);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="template-title">Titel</Label>
            <Input
              id="template-title"
              name="title"
              required
              placeholder="z. B. Vollmacht Steuer"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="template-description">Beschreibung</Label>
            <Textarea
              id="template-description"
              name="description"
              rows={3}
              placeholder="Optional: wofür die Vorlage gedacht ist"
              className="rounded-xl"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="template-files">Dateien</Label>
            <Input
              id="template-files"
              ref={fileRef}
              name="files"
              type="file"
              multiple
              required
              className="h-11 rounded-xl pt-2"
            />
            <p className="text-xs text-muted-foreground">
              Alle Dateitypen, max. 50 MB pro Datei.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isPending}>
              Anlegen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditTemplateDialog({
  template,
  open,
  onOpenChange,
  isPending,
  onUpdated,
  onClose,
  startTransition,
}: {
  template: Template;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onUpdated: (template: Template) => void;
  onClose: () => void;
  startTransition: (fn: () => void) => void;
}) {
  const [title, setTitle] = useState(template.title);
  const [description, setDescription] = useState(template.description);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vorlage bearbeiten</DialogTitle>
          <DialogDescription>
            Metadaten ändern oder Dateien hinzufügen bzw. entfernen.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-title">Titel</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-description">Beschreibung</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Dateien</Label>
            <ul className="space-y-2">
              {template.files.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{file.filename}</span>
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={`/api/templates/files/${file.id}`}
                      download={file.filename}
                    >
                      <DownloadIcon className="size-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={isPending || template.files.length <= 1}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await deleteTemplateFile(file.id);
                        if (!result.success) {
                          toast.error(result.error);
                          return;
                        }
                        onUpdated(result.template);
                        toast.success("Datei entfernt.");
                      });
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2">
              <Input
                ref={fileRef}
                type="file"
                multiple
                className="h-11 rounded-xl pt-2"
              />
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  const files = fileRef.current?.files;
                  if (!files || files.length === 0) {
                    toast.error("Bitte Dateien auswählen.");
                    return;
                  }
                  const formData = new FormData();
                  for (const file of Array.from(files)) {
                    formData.append("files", file);
                  }
                  startTransition(async () => {
                    const result = await addTemplateFiles(
                      template.id,
                      formData
                    );
                    if (!result.success) {
                      toast.error(result.error);
                      return;
                    }
                    onUpdated(result.template);
                    if (fileRef.current) fileRef.current.value = "";
                    toast.success("Dateien hinzugefügt.");
                  });
                }}
              >
                <UploadIcon data-icon="inline-start" />
                Hochladen
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Schließen
          </Button>
          <Button
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await updateTemplateMeta(template.id, {
                  title,
                  description,
                });
                if (!result.success) {
                  toast.error(result.error);
                  return;
                }
                onUpdated(result.template);
                toast.success("Gespeichert.");
              });
            }}
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
