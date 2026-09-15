"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";

import { V1PromptTagsInput } from "@/components/v1/prompts/prompt-tags-input";
import { Button } from "@/components/v1/ui/button";
import { Card, CardContent } from "@/components/v1/ui/card";
import { Input } from "@/components/v1/ui/input";
import { Label } from "@/components/v1/ui/label";
import { Textarea } from "@/components/v1/ui/textarea";
import { createPrompt, updatePrompt } from "@/lib/prompts/actions";
import type { Prompt, PromptInput } from "@/lib/prompts/types";
import { cn } from "@/lib/utils";

const PROMPT_BASE = "/v1/prompt";

type V1PromptFormProps = {
  mode: "create" | "edit";
  promptId?: string;
  initialValues?: PromptInput;
  availableTags: string[];
  /** page = eigene Route; panel = Sheet/Seitenleiste */
  variant?: "page" | "panel";
  onSuccess?: (prompt: Prompt) => void;
  onCancel?: () => void;
};

export function V1PromptForm({
  mode,
  promptId,
  initialValues,
  availableTags,
  variant = "page",
  onSuccess,
  onCancel,
}: V1PromptFormProps) {
  const router = useRouter();
  const isPanel = variant === "panel";
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [tags, setTags] = useState(initialValues?.tags ?? []);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTitle(initialValues?.title ?? "");
    setContent(initialValues?.content ?? "");
    setTags(initialValues?.tags ?? []);
  }, [initialValues?.title, initialValues?.content, initialValues?.tags, promptId]);

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push(`${PROMPT_BASE}?mode=verwalten`);
  }

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

      if (onSuccess && result.item) {
        onSuccess(result.item);
        return;
      }

      router.push(`${PROMPT_BASE}?mode=verwalten`);
      router.refresh();
    });
  }

  const formBody = (
    <form
      onSubmit={handleSubmit}
      className={cn(isPanel && "flex min-h-0 flex-1 flex-col")}
    >
      <div
        className={cn(
          "space-y-6",
          isPanel ? "flex-1 overflow-y-auto px-4 pb-4" : "px-6 py-6"
        )}
      >
        <div className="grid gap-2">
          <Label htmlFor="title">Titel</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="z. B. E-Mail zusammenfassen"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label>Tags</Label>
          <V1PromptTagsInput
            value={tags}
            onChange={setTags}
            suggestions={availableTags}
            disabled={isPending}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="content">Prompt-Text</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Dein Prompt…"
            required
            className={cn(
              "resize-y font-mono text-sm leading-relaxed",
              isPanel
                ? "min-h-[min(40dvh,24rem)]"
                : "min-h-[min(50dvh,32rem)]"
            )}
          />
        </div>
      </div>

      <div
        className={cn(
          "flex justify-end gap-2 border-t",
          isPanel ? "px-4 py-4" : "px-6 py-4"
        )}
      >
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={handleCancel}
        >
          Abbrechen
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
  );

  if (isPanel) {
    return formBody;
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-6">
      <Button asChild variant="ghost" size="sm" className="w-fit px-0">
        <Link href={`${PROMPT_BASE}?mode=verwalten`}>
          <ArrowLeftIcon />
          Zurück zur Bibliothek
        </Link>
      </Button>

      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-medium tracking-tight">
          {mode === "edit" ? "Prompt bearbeiten" : "Neuer Prompt"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Titel, Tags und Prompt-Text speichern.
        </p>
      </div>

      <Card className="gap-0 border-border/80 py-0 shadow-none">
        <CardContent className="p-0">{formBody}</CardContent>
      </Card>
    </div>
  );
}
