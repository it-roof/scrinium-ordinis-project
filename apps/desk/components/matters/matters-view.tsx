"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  CreateMatterDialog,
  type MatterClientOption,
} from "@/components/matters/create-matter-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { useAreaBasePath } from "@/lib/area/use-area-path";
import type { MatterRecord } from "@/lib/clients/types";
import { deleteMatter, updateMatter } from "@/lib/matters/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_EDIT = {
  title: "",
  reference: "",
  notes: "",
};

export function MattersView({
  initialItems,
  clients,
}: {
  initialItems: MatterRecord[];
  clients: MatterClientOption[];
}) {
  const router = useRouter();
  const basePath = useAreaBasePath() ?? "";
  const [items, setItems] = useState(initialItems);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [isPending, startTransition] = useTransition();

  function startEdit(item: MatterRecord) {
    setEditingId(item.id);
    setEditForm({
      title: item.title,
      reference: item.reference,
      notes: item.notes,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(EMPTY_EDIT);
  }

  function handleSaveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingId) {
      return;
    }
    startTransition(async () => {
      const result = await updateMatter(editingId, {
        title: editForm.title,
        reference: editForm.reference,
        notes: editForm.notes,
        module: "legal",
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setItems((prev) =>
        prev
          .map((item) => (item.id === editingId ? result.item : item))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      );
      cancelEdit();
      toast.success("Akte gespeichert.");
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteMatter(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) {
        cancelEdit();
      }
      toast.success("Akte gelöscht.");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <PageHeader title="Akten" description="Alle Akten im aktuellen Bereich.">
        <Button
          type="button"
          className="h-10 rounded-none px-4"
          disabled={clients.length === 0}
          onClick={() => setCreateOpen(true)}
        >
          <PlusIcon data-icon="inline-start" />
          Akte
        </Button>
      </PageHeader>

      <CreateMatterDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            router.refresh();
          }
        }}
        clients={clients}
        onCreated={(matter) => {
          setItems((prev) => [matter, ...prev]);
        }}
      />

      {clients.length === 0 ? (
        <div className="surface-card border-dashed p-10 text-center text-sm text-muted-foreground">
          Zuerst einen Mandanten anlegen, dann Akten erstellen.
        </div>
      ) : items.length === 0 ? (
        <div className="surface-card border-dashed p-10 text-center text-sm text-muted-foreground">
          Noch keine Akten.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="surface-card p-5">
              {editingId === item.id ? (
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`edit-title-${item.id}`}>Titel</Label>
                    <Input
                      id={`edit-title-${item.id}`}
                      value={editForm.title}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          title: event.target.value,
                        }))
                      }
                      className="h-11 rounded-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`edit-ref-${item.id}`}>Aktenzeichen</Label>
                    <Input
                      id={`edit-ref-${item.id}`}
                      value={editForm.reference}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          reference: event.target.value,
                        }))
                      }
                      className="h-11 rounded-none"
                      placeholder="optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`edit-notes-${item.id}`}>Notiz</Label>
                    <Textarea
                      id={`edit-notes-${item.id}`}
                      value={editForm.notes}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          notes: event.target.value,
                        }))
                      }
                      rows={2}
                      className="rounded-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="h-11 rounded-none px-5"
                    >
                      Speichern
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isPending}
                      onClick={cancelEdit}
                      className="h-11 rounded-none px-4"
                    >
                      Abbrechen
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <Link
                      href={`${basePath}/akten/${item.id}`}
                      className="font-heading text-lg font-medium tracking-tight hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      <Link
                        href={`${basePath}/mandanten/${item.clientId}`}
                        className="hover:underline"
                      >
                        {item.clientName}
                      </Link>
                      {item.reference ? ` · ${item.reference}` : ""}
                      {` · ${item.letterCount} Dokument`}
                      {item.letterCount === 1 ? "" : "e"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => startEdit(item)}
                      className="rounded-none"
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleDelete(item.id)}
                      className="rounded-none text-destructive"
                    >
                      <Trash2Icon data-icon="inline-start" />
                      Löschen
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
