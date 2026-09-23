"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowLeftIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { PromptContentDiff } from "@/components/desk/prompts/prompt-content-diff";
import { V1PromptTagsInput } from "@/components/desk/prompts/prompt-tags-input";
import { Button } from "@/components/desk/ui/button";
import { Card, CardContent } from "@/components/desk/ui/card";
import { Input } from "@/components/desk/ui/input";
import { Label } from "@/components/desk/ui/label";
import { Textarea } from "@/components/desk/ui/textarea";
import {
  checkPromptNumber,
  createPrompt,
  updatePrompt,
} from "@/lib/prompts/actions";
import {
  formatPromptNumber,
  type Prompt,
  type PromptInput,
} from "@/lib/prompts/types";
import { cn } from "@/lib/utils";

const PROMPT_BASE = "/prompt";
const NUMBER_CHECK_DEBOUNCE_MS = 300;

type NumberCheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available" }
  | { status: "taken"; title: string }
  | { status: "invalid"; message: string };

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
  const [numberInput, setNumberInput] = useState(
    initialValues?.number != null
      ? formatPromptNumber(initialValues.number)
      : ""
  );
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [tags, setTags] = useState(initialValues?.tags ?? []);
  const [isPending, startTransition] = useTransition();
  const [originalContent, setOriginalContent] = useState(
    initialValues?.content ?? ""
  );
  const [numberCheck, setNumberCheck] = useState<NumberCheckState>({
    status: "idle",
  });
  const [diffOpen, setDiffOpen] = useState(false);
  const [comparedContent, setComparedContent] = useState("");

  useEffect(() => {
    setNumberInput(
      initialValues?.number != null
        ? formatPromptNumber(initialValues.number)
        : ""
    );
    setTitle(initialValues?.title ?? "");
    setContent(initialValues?.content ?? "");
    setTags(initialValues?.tags ?? []);
    setOriginalContent(initialValues?.content ?? "");
    setNumberCheck({ status: "idle" });
    setDiffOpen(false);
    setComparedContent("");
  }, [
    initialValues?.number,
    initialValues?.title,
    initialValues?.content,
    initialValues?.tags,
    promptId,
  ]);

  useEffect(() => {
    const trimmed = numberInput.trim();
    if (trimmed === "") {
      setNumberCheck({ status: "idle" });
      return;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || !/^\d+$/.test(trimmed)) {
      setNumberCheck({
        status: "invalid",
        message: "Bitte eine ganze Zahl ab 1 eingeben.",
      });
      return;
    }

    if (mode === "edit" && initialValues?.number === parsed) {
      setNumberCheck({ status: "idle" });
      return;
    }

    setNumberCheck({ status: "checking" });
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const result = await checkPromptNumber(parsed, promptId);
      if (cancelled) return;
      if (!result.success) {
        setNumberCheck({ status: "invalid", message: result.error });
        return;
      }
      if (result.available) {
        setNumberCheck({ status: "available" });
        return;
      }
      setNumberCheck({
        status: "taken",
        title: result.takenBy.title,
      });
    }, NUMBER_CHECK_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [numberInput, mode, promptId, initialValues?.number]);

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push(PROMPT_BASE);
  }

  function handleCompare() {
    setComparedContent(content);
    setDiffOpen(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedNumber = numberInput.trim();
    const number =
      trimmedNumber === ""
        ? null
        : Number.parseInt(trimmedNumber, 10);
    const input: PromptInput = { number, title, content, tags };

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

      router.push(PROMPT_BASE);
      router.refresh();
    });
  }

  const numberHint =
    numberCheck.status === "checking" ? (
      <p className="text-xs text-muted-foreground">Nummer wird geprüft…</p>
    ) : numberCheck.status === "taken" ? (
      <p className="text-xs text-destructive">
        Nummer bereits vergeben: „{numberCheck.title}“
      </p>
    ) : numberCheck.status === "invalid" ? (
      <p className="text-xs text-destructive">{numberCheck.message}</p>
    ) : numberCheck.status === "available" ? (
      <p className="text-xs text-emerald-700">Nummer ist frei.</p>
    ) : mode === "create" ? (
      <p className="text-xs text-muted-foreground">
        Leer = nächste freie Nummer.
      </p>
    ) : null;

  const fields = (
    <div
      className={cn(
        "space-y-6",
        isPanel ? "flex-1 overflow-y-auto px-4 pb-4" : "px-6 py-6"
      )}
    >
      <div className="grid gap-2 sm:max-w-[12rem]">
        <Label htmlFor="prompt-number">Nummer</Label>
        <Input
          id="prompt-number"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={numberInput}
          onChange={(event) => setNumberInput(event.target.value)}
          onBlur={() => {
            const parsed = Number.parseInt(numberInput.trim(), 10);
            if (Number.isInteger(parsed) && parsed >= 1) {
              setNumberInput(formatPromptNumber(parsed));
            }
          }}
          placeholder={mode === "create" ? "Auto" : undefined}
          required={mode === "edit"}
          aria-invalid={
            numberCheck.status === "taken" || numberCheck.status === "invalid"
          }
          className={cn(
            "tabular-nums",
            (numberCheck.status === "taken" ||
              numberCheck.status === "invalid") &&
              "border-destructive focus-visible:ring-destructive/30"
          )}
        />
        {numberHint}
      </div>

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
  );

  const actions = (
    <div
      className={cn(
        "flex flex-wrap justify-end gap-2 border-t",
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
      {mode === "edit" ? (
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={handleCompare}
        >
          Vergleichen
        </Button>
      ) : null}
      <Button
        type="submit"
        disabled={
          isPending ||
          numberCheck.status === "taken" ||
          numberCheck.status === "invalid" ||
          numberCheck.status === "checking"
        }
      >
        {isPending
          ? "Speichern…"
          : mode === "edit"
            ? "Speichern"
            : "Anlegen"}
      </Button>
    </div>
  );

  const formBody = (
    <form
      onSubmit={handleSubmit}
      className={cn(isPanel && "flex min-h-0 flex-1 flex-col")}
    >
      {fields}
      {actions}
    </form>
  );

  if (isPanel) {
    return formBody;
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-6">
      <Button asChild variant="ghost" size="sm" className="w-fit px-0">
        <Link href={PROMPT_BASE}>
          <ArrowLeftIcon />
          Zurück zur Bibliothek
        </Link>
      </Button>

      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-medium tracking-tight">
          {mode === "edit" ? "Prompt bearbeiten" : "Neuer Prompt"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "edit"
            ? "Änderungen speichern oder mit „Vergleichen“ den Prompt-Text prüfen."
            : "Titel, Tags und Prompt-Text speichern."}
        </p>
      </div>

      <Card className="gap-0 border-border/80 py-0 shadow-none">
        <CardContent className="p-0">{formBody}</CardContent>
      </Card>

      {mode === "edit" && diffOpen ? (
        <div className="relative rounded-xl border border-border/70 bg-muted/15 p-4">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-3 right-3"
            onClick={() => setDiffOpen(false)}
            aria-label="Vergleich schließen"
          >
            <XIcon />
          </Button>
          <PromptContentDiff
            before={originalContent}
            after={comparedContent}
            layout="side"
            className="pr-8"
          />
        </div>
      ) : null}
    </div>
  );
}
