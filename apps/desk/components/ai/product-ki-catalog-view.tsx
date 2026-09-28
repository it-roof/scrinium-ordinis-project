import Link from "next/link";

import type { ProductAction } from "@/lib/ai/product-actions";
import type { ProductPromptCatalogEntry } from "@/lib/ai/product-prompt-catalog";

const KIND_LABEL: Record<ProductAction["kind"], string> = {
  prompt: "Prompt",
  function: "Funktion",
};

const STATUS_LABEL: Record<ProductAction["status"], string> = {
  live: "live",
  planned: "geplant",
};

const SLOT_LABEL: Record<string, string> = {
  free: "Freier Chat",
  matter: "Akten-Chat",
};

export function ProductKiCatalogView({
  prompts,
  actions,
}: {
  prompts: ProductPromptCatalogEntry[];
  actions: readonly ProductAction[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col gap-10 overflow-y-auto p-4 lg:p-6">
      <div className="space-y-2">
        <p className="b-eyebrow">
          <Link href="/ai-debug" className="hover:underline">
            KI-Debug
          </Link>
        </p>
        <h1 className="b-title">Produkt-KI</h1>
        <p className="b-lead">
          Read-only Übersicht: vordefinierte Aktionen und Produkt-Systemprompts.
          Nicht die Prompt-Bibliothek der Kanzlei.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="b-title text-lg">Vordefinierte Aktionen</h2>
        <ul className="flex flex-col gap-2">
          {actions.map((action) => (
            <li
              key={action.id}
              className="rounded-2xl border border-[var(--b-line)] bg-[var(--b-bg-elev)] px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-[var(--b-ink)]">{action.label}</p>
                <p className="b-meta">
                  {KIND_LABEL[action.kind]} · {STATUS_LABEL[action.status]}
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
      </section>

      <section className="space-y-4">
        <h2 className="b-title text-lg">Produkt-Systemprompts</h2>
        <div className="flex flex-col gap-6">
          {prompts.map((prompt) => (
            <article
              key={prompt.id}
              className="rounded-2xl border border-[var(--b-line)] bg-[var(--b-bg-elev)] overflow-hidden"
            >
              <div className="border-b border-[var(--b-line)] px-4 py-3 space-y-1">
                <p className="font-medium text-[var(--b-ink)]">{prompt.label}</p>
                <p className="b-meta">
                  task: <code className="font-mono text-xs">{prompt.task}</code>
                  {prompt.actionId ? (
                    <>
                      {" · "}action:{" "}
                      <code className="font-mono text-xs">{prompt.actionId}</code>
                    </>
                  ) : null}
                </p>
              </div>
              <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap px-4 py-3 text-xs leading-relaxed text-[var(--b-ink)]">
                {prompt.body}
              </pre>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
