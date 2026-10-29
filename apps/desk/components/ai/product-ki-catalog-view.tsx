"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckIcon, ChevronDownIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

import type { ProductAction } from "@/lib/ai/product-actions";
import type { ProductPromptCatalogEntry } from "@/lib/ai/product-prompt-catalog";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<ProductAction["status"], string> = {
  live: "live",
  planned: "geplant",
};

const SLOT_LABEL: Record<string, string> = {
  matter: "Akten-Chat",
};

function FunctionActionList({ actions }: { actions: readonly ProductAction[] }) {
  if (actions.length === 0) {
    return <p className="b-meta">Keine Einträge.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {actions.map((action) => (
        <li
          key={action.id}
          className="rounded-2xl border border-[var(--b-line)] bg-[var(--b-bg-elev)] px-4 py-3"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium text-[var(--b-ink)]">{action.label}</p>
            <p className="b-meta">
              {STATUS_LABEL[action.status]}
              {action.badgeV1 ? " · Badge v1" : ""}
            </p>
          </div>
          <p className="b-meta mt-1">
            id: <code className="font-mono text-xs">{action.id}</code>
            {" · "}
            {action.chatSlots.map((s) => SLOT_LABEL[s] ?? s).join(", ")}
          </p>
        </li>
      ))}
    </ul>
  );
}

function PromptActionCard({
  action,
  prompt,
}: {
  action: ProductAction;
  prompt: ProductPromptCatalogEntry | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    if (!prompt?.body) return;
    try {
      await navigator.clipboard.writeText(prompt.body);
      setCopied(true);
      toast.success("Prompt kopiert.");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Kopieren fehlgeschlagen.");
    }
  }

  return (
    <li className="rounded-2xl border border-[var(--b-line)] bg-[var(--b-bg-elev)] overflow-hidden">
      <div className="space-y-1 px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium text-[var(--b-ink)]">{action.label}</p>
          <p className="b-meta">
            {STATUS_LABEL[action.status]}
            {action.badgeV1 ? " · Badge v1" : ""}
          </p>
        </div>
        <p className="b-meta">
          id: <code className="font-mono text-xs">{action.id}</code>
          {" · "}
          {action.chatSlots.map((s) => SLOT_LABEL[s] ?? s).join(", ")}
          {prompt ? (
            <>
              {" · "}task:{" "}
              <code className="font-mono text-xs">{prompt.task}</code>
            </>
          ) : null}
        </p>
      </div>

      {prompt ? (
        <div className="border-t border-[var(--b-line)]">
          <div className="flex items-center gap-1 px-2 py-1.5">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--b-soft)]"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="b-meta font-medium">
                {open ? "Systemprompt einklappen" : "Systemprompt anzeigen"}
              </span>
              <ChevronDownIcon
                className={cn(
                  "size-4 shrink-0 text-[var(--b-muted)] transition-transform",
                  open && "rotate-180"
                )}
                strokeWidth={1.75}
              />
            </button>
            <button
              type="button"
              className="lab-chat-icon-btn lab-chat-icon-btn--outline shrink-0"
              onClick={() => void copyPrompt()}
              aria-label="Systemprompt kopieren"
              title="Kopieren"
            >
              {copied ? (
                <CheckIcon className="size-4" strokeWidth={2} />
              ) : (
                <CopyIcon className="size-4" strokeWidth={1.75} />
              )}
            </button>
          </div>
          {open ? (
            <pre className="whitespace-pre-wrap border-t border-[var(--b-line)] px-4 py-3 text-xs leading-relaxed text-[var(--b-ink)]">
              {prompt.body}
            </pre>
          ) : null}
        </div>
      ) : (
        <p className="b-meta border-t border-[var(--b-line)] px-4 py-3">
          Kein Systemprompt hinterlegt.
        </p>
      )}
    </li>
  );
}

function PromptActionList({
  actions,
  promptsByActionId,
}: {
  actions: readonly ProductAction[];
  promptsByActionId: Map<string, ProductPromptCatalogEntry>;
}) {
  if (actions.length === 0) {
    return <p className="b-meta">Keine Einträge.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {actions.map((action) => (
        <PromptActionCard
          key={action.id}
          action={action}
          prompt={promptsByActionId.get(action.id)}
        />
      ))}
    </ul>
  );
}

export function ProductKiCatalogView({
  prompts,
  actions,
}: {
  prompts: ProductPromptCatalogEntry[];
  actions: readonly ProductAction[];
}) {
  const promptActions = actions.filter((a) => a.kind === "prompt");
  const functionActions = actions.filter((a) => a.kind === "function");
  const promptsByActionId = new Map(
    prompts
      .filter((p) => p.actionId)
      .map((p) => [p.actionId as string, p] as const)
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 p-4 lg:p-6">
        <div className="space-y-2">
          <p className="b-eyebrow">
            <Link href="/ai-debug" className="hover:underline">
              KI-Debug
            </Link>
          </p>
          <h1 className="b-title">Produkt-KI</h1>
          <p className="b-lead">
            Read-only Übersicht der vordefinierten Aktionen. Prompt-Aktionen
            zeigen den Systemprompt aufklappbar in der Karte. Nicht die
            Prompt-Bibliothek der Kanzlei.
          </p>
        </div>

        <section className="space-y-6">
          <h2 className="b-title text-lg">Vordefinierte Aktionen</h2>

          <div className="space-y-3">
            <h3 className="b-meta font-medium uppercase tracking-wide">
              Mit Prompt
            </h3>
            <PromptActionList
              actions={promptActions}
              promptsByActionId={promptsByActionId}
            />
          </div>

          <div className="space-y-3">
            <h3 className="b-meta font-medium uppercase tracking-wide">
              Mit Funktion
            </h3>
            <FunctionActionList actions={functionActions} />
          </div>
        </section>
      </div>
    </div>
  );
}
