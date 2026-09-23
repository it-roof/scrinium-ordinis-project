"use client";

import { diffWords } from "diff";

import { cn } from "@/lib/utils";

type PromptContentDiffProps = {
  before: string;
  after: string;
  /** stack = untereinander (rechte Spalte); side = nebeneinander */
  layout?: "stack" | "side";
  className?: string;
};

function DiffPane({
  title,
  parts,
  side,
  className,
}: {
  title: string;
  parts: ReturnType<typeof diffWords>;
  side: "before" | "after";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-border/70 bg-background",
        className
      )}
    >
      <div className="shrink-0 border-b border-border/50 px-3 py-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-3 font-mono text-sm leading-relaxed text-foreground">
        {parts.map((part, index) => {
          if (side === "before" && part.added) return null;
          if (side === "after" && part.removed) return null;

          return (
            <span
              key={`${side}-${index}`}
              className={cn(
                part.removed &&
                  "bg-red-100/60 text-red-700 line-through dark:bg-red-950/40 dark:text-red-300",
                part.added &&
                  "bg-yellow-200/80 text-foreground dark:bg-yellow-500/25"
              )}
            >
              {part.value}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

export function PromptContentDiff({
  before,
  after,
  layout = "side",
  className,
}: PromptContentDiffProps) {
  const identical = before === after;
  const parts = identical ? [] : diffWords(before, after);

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      <div className="shrink-0 space-y-0.5">
        <p className="text-sm font-medium text-foreground">Änderungen</p>
        <p className="text-xs text-muted-foreground">
          {identical
            ? "Keine Unterschiede."
            : "Gelb = neu · Rot durchgestrichen = entfernt"}
        </p>
      </div>

      {identical ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          Keine Unterschiede.
        </div>
      ) : (
        <div
          className={cn(
            "flex min-h-0 flex-1 gap-3",
            layout === "stack" ? "flex-col" : "flex-col lg:flex-row"
          )}
        >
          <DiffPane
            title="Bisher"
            parts={parts}
            side="before"
            className={layout === "stack" ? "min-h-[12rem]" : undefined}
          />
          <DiffPane
            title="Neu"
            parts={parts}
            side="after"
            className={layout === "stack" ? "min-h-[12rem]" : undefined}
          />
        </div>
      )}
    </div>
  );
}
