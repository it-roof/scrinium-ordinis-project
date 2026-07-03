"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { PromptTagsInput } from "@/components/prompts/prompt-tags-input";
import { createPrompt, updatePrompt } from "@/lib/prompts/actions";
import type { PromptInput } from "@/lib/prompts/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type PromptFormProps = {
  mode: "create" | "edit";
  promptId?: string;
  initialValues?: PromptInput;
  availableTags: string[];
};

export function PromptForm({
  mode,
  promptId,
  initialValues,
  availableTags,
}: PromptFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [tags, setTags] = useState(initialValues?.tags ?? []);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = { title, content, tags };

    startTransition(async () => {
      const result =
        mode === "edit" && promptId
          ? await updatePrompt(promptId, input)
          : await createPrompt(input);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "edit" ? "Prompt aktualisiert." : "Prompt angelegt."
      );
      router.push("/prompt");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 pb-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-fit px-0 text-muted-foreground hover:text-foreground"
      >
        <Link href="/prompt">
          <ArrowLeftIcon data-icon="inline-start" />
          Zurück zur Übersicht
        </Link>
      </Button>

      <PageHeader
        eyebrow={mode === "edit" ? "Bearbeiten" : "Neu anlegen"}
        title={mode === "edit" ? "Prompt bearbeiten" : "Neuer Prompt"}
        description="Titel, Tags und Prompt-Text — die Seite scrollt mit, lange Texte sind kein Problem."
      />

      <form
        onSubmit={handleSubmit}
        className="surface-card flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="space-y-6 p-6">
          <div className="grid gap-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="z. B. E-Mail zusammenfassen"
              className="h-11 rounded-xl"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label>Tags</Label>
            <PromptTagsInput
              value={tags}
              onChange={setTags}
              suggestions={availableTags}
              disabled={isPending}
            />
          </div>

          <div className="grid min-h-0 flex-1 gap-2">
            <Label htmlFor="content">Prompt-Text</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Dein Prompt…"
              required
              className="min-h-[min(70dvh,48rem)] resize-y rounded-xl font-mono text-sm leading-relaxed"
            />
          </div>
        </div>

        <div className="mt-auto flex flex-col-reverse gap-2 border-t border-border/70 bg-muted/30 p-4 sm:flex-row sm:justify-end">
          <Button variant="outline" asChild disabled={isPending}>
            <Link href="/prompt">Abbrechen</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Speichern…"
              : mode === "edit"
                ? "Speichern"
                : "Anlegen"}
          </Button>
        </div>
      </form>
    </div>
  );
}
