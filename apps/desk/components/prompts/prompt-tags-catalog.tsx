"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckIcon, PencilIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { renamePromptTag } from "@/lib/prompts/actions";
import type { PromptTagWithCount } from "@/lib/prompts/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PromptTagsCatalogProps = {
  initialTags: PromptTagWithCount[];
  onRenamed: (change: {
    fromId: string;
    toId: string;
    name: string;
    merged: boolean;
  }) => void;
};

export function PromptTagsCatalog({
  initialTags,
  onRenamed,
}: PromptTagsCatalogProps) {
  const [tags, setTags] = useState(initialTags);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  if (tags.length === 0) {
    return null;
  }

  function startEdit(tag: PromptTagWithCount) {
    setEditingId(tag.id);
    setDraftName(tag.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftName("");
  }

  function saveEdit(tag: PromptTagWithCount) {
    startTransition(async () => {
      const result = await renamePromptTag(tag.id, draftName);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      if (result.merged) {
        setTags((current) => current.filter((entry) => entry.id !== tag.id));
      } else {
        setTags((current) =>
          current.map((entry) =>
            entry.id === tag.id
              ? { ...entry, id: result.tag.id, name: result.tag.name }
              : entry
          )
        );
      }

      onRenamed({
        fromId: tag.id,
        toId: result.tag.id,
        name: result.tag.name,
        merged: result.merged,
      });

      if (result.merged) {
        toast.success(
          `Tag mit „${result.tag.name}" zusammengeführt — gilt für alle Prompts.`
        );
      } else {
        toast.success("Tag umbenannt — gilt für alle Prompts.");
      }

      cancelEdit();
    });
  }

  return (
    <section className="surface-panel space-y-4 p-4 md:p-5">
      <div>
        <h2 className="font-heading text-base font-medium tracking-tight">
          Tags verwalten
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bestehende Tags umbenennen — die Änderung gilt für alle verknüpften
          Prompts.
        </p>
      </div>

      <ul className="divide-y divide-border/60 rounded-none border border-border/70 bg-background">
        {tags.map((tag) => {
          const isEditing = editingId === tag.id;
          return (
            <li
              key={tag.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              {isEditing ? (
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    className="h-10 max-w-sm rounded-xl"
                    autoFocus
                    disabled={isPending}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        saveEdit(tag);
                      }
                      if (event.key === "Escape") {
                        cancelEdit();
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {tag.promptCount}{" "}
                    {tag.promptCount === 1 ? "Prompt" : "Prompts"}
                  </p>
                </div>
              ) : (
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium">{tag.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tag.promptCount}{" "}
                    {tag.promptCount === 1 ? "Prompt" : "Prompts"}
                  </p>
                </div>
              )}

              <div className="flex shrink-0 items-center gap-1">
                {isEditing ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending || !draftName.trim()}
                      onClick={() => saveEdit(tag)}
                    >
                      <CheckIcon data-icon="inline-start" />
                      Speichern
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={cancelEdit}
                    >
                      <XIcon data-icon="inline-start" />
                      Abbrechen
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending || editingId !== null}
                    onClick={() => startEdit(tag)}
                  >
                    <PencilIcon data-icon="inline-start" />
                    Umbenennen
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
