"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowLeftIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { PromptContentDiff } from "@/components/desk/prompts/prompt-content-diff";
import { V1PromptTagsInput } from "@/components/desk/prompts/prompt-tags-input";
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
  /** Zurück-/Erfolg-Ziel (z. B. `/platform/prompts`). */
  libraryHref?: string;
  onSuccess?: (prompt: Prompt) => void;
  onCancel?: () => void;
};

export function V1PromptForm({
  mode,
  promptId,
  initialValues,
  availableTags,
  variant = "page",
  libraryHref = "/prompt",
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
    router.push(libraryHref);
  }

  function handleCompare() {
    setComparedContent(content);
    setDiffOpen(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedNumber = numberInput.trim();
    const number =
      trimmedNumber === "" ? null : Number.parseInt(trimmedNumber, 10);
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

      router.push(libraryHref);
      router.refresh();
    });
  }

  const numberHint =
    numberCheck.status === "checking" ? (
      <p className="b-meta mt-1.5">Nummer wird geprüft…</p>
    ) : numberCheck.status === "taken" ? (
      <p className="b-meta mt-1.5" style={{ color: "var(--b-accent)" }}>
        Nummer bereits vergeben: „{numberCheck.title}“
      </p>
    ) : numberCheck.status === "invalid" ? (
      <p className="b-meta mt-1.5" style={{ color: "var(--b-accent)" }}>
        {numberCheck.message}
      </p>
    ) : numberCheck.status === "available" ? (
      <p className="b-meta mt-1.5">Nummer ist frei.</p>
    ) : mode === "create" ? (
      <p className="b-meta mt-1.5">Leer = nächste freie Nummer.</p>
    ) : null;

  const submitDisabled =
    isPending ||
    numberCheck.status === "taken" ||
    numberCheck.status === "invalid" ||
    numberCheck.status === "checking";

  const fields = (
    <div className={cn("flex flex-col gap-6", isPanel ? "px-1" : "")}>
      <div className="flex max-w-[12rem] flex-col gap-1.5">
        <label htmlFor="prompt-number" className="b-meta">
          Nummer
        </label>
        <input
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
          className="lab-field tabular-nums"
        />
        {numberHint}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="b-meta">
          Titel
        </label>
        <input
          id="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="z. B. E-Mail zusammenfassen"
          required
          className="lab-field"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="b-meta">Tags</span>
        <V1PromptTagsInput
          value={tags}
          onChange={setTags}
          suggestions={availableTags}
          disabled={isPending}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="content" className="b-meta">
          Prompt-Text
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Dein Prompt…"
          required
          className={cn(
            "lab-field font-mono text-[0.875rem] leading-relaxed",
            isPanel
              ? "!h-auto min-h-[min(40dvh,24rem)] py-3"
              : "!h-auto min-h-[min(50dvh,32rem)] py-3"
          )}
        />
      </div>
    </div>
  );

  const actions = (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        isPanel ? "justify-end pt-4" : "justify-end border-t pt-6",
        !isPanel && "mt-8"
      )}
      style={!isPanel ? { borderColor: "var(--b-line)" } : undefined}
    >
      <button
        type="button"
        className="b-btn b-btn-ghost"
        disabled={isPending}
        onClick={handleCancel}
      >
        Abbrechen
      </button>
      {mode === "edit" ? (
        <button
          type="button"
          className="b-btn b-btn-secondary"
          disabled={isPending}
          onClick={handleCompare}
        >
          Vergleichen
        </button>
      ) : null}
      <button
        type="submit"
        className="b-btn b-btn-primary"
        disabled={submitDisabled}
      >
        {isPending
          ? "Speichern…"
          : mode === "edit"
            ? "Speichern"
            : "Anlegen"}
      </button>
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
    <div className="lab-prompts relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pt-10 pb-14 md:px-10 md:pt-12">
        <Link
          href={libraryHref}
          className="b-meta inline-flex w-fit items-center gap-1.5 transition-colors hover:text-[var(--b-ink)]"
          style={{ color: "var(--b-muted)" }}
        >
          <ArrowLeftIcon className="size-3.5" strokeWidth={1.75} />
          Zurück zur Bibliothek
        </Link>

        <header className="mt-6 flex max-w-2xl flex-col">
          <h1 className="b-display b-title font-medium tracking-[-0.02em]">
            {mode === "edit" ? "Prompt bearbeiten" : "Neuer Prompt"}
          </h1>
          <p className="b-lead mt-2 max-w-none text-[1.0625rem] leading-[1.55]">
            {mode === "edit"
              ? "Nummer, Titel, Tags und Text anpassen — optional mit Vergleich prüfen."
              : "Titel, Tags und Prompt-Text speichern."}
          </p>
        </header>

        <div className="mt-10">{formBody}</div>

        {mode === "edit" && diffOpen ? (
          <div
            className="relative mt-8 rounded-[0.85rem] border px-5 py-5"
            style={{
              borderColor: "var(--b-line)",
              background: "var(--b-soft)",
            }}
          >
            <button
              type="button"
              className="b-btn b-btn-ghost absolute top-3 right-3 !px-2"
              onClick={() => setDiffOpen(false)}
              aria-label="Vergleich schließen"
            >
              <XIcon className="size-4" strokeWidth={1.75} />
            </button>
            <PromptContentDiff
              before={originalContent}
              after={comparedContent}
              layout="side"
              className="pr-8"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
