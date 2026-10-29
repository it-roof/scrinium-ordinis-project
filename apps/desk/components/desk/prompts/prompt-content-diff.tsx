"use client";

import { cn } from "@/lib/utils";

type DiffPart = {
  value: string;
  added?: boolean;
  removed?: boolean;
};

type PromptContentDiffProps = {
  before: string;
  after: string;
  /** stack = untereinander (rechte Spalte); side = nebeneinander */
  layout?: "stack" | "side";
  className?: string;
};

/** Wort-Diff ohne `diff`-Package (CJS/require bricht im Client-Bundle). */
function diffWords(before: string, after: string): DiffPart[] {
  if (before === after) return [{ value: before }];

  const tokenize = (text: string) =>
    text.split(/(\s+)/).filter((part) => part.length > 0);
  const a = tokenize(before);
  const b = tokenize(after);
  const n = a.length;
  const m = b.length;

  // Sehr große Texte: ganzes Vorher/Nachher statt O(n·m)
  if (n * m > 1_500_000) {
    return [
      { value: before, removed: true },
      { value: after, added: true },
    ];
  }

  const dp: Uint16Array[] = Array.from(
    { length: n + 1 },
    () => new Uint16Array(m + 1)
  );
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const row = dp[i]!;
      row[j] =
        a[i - 1] === b[j - 1]
          ? (dp[i - 1]![j - 1]! + 1) as number
          : Math.max(dp[i - 1]![j]!, row[j - 1]!);
    }
  }

  const stack: DiffPart[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      stack.push({ value: a[i - 1]! });
      i -= 1;
      j -= 1;
      continue;
    }
    if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      stack.push({ value: b[j - 1]!, added: true });
      j -= 1;
      continue;
    }
    stack.push({ value: a[i - 1]!, removed: true });
    i -= 1;
  }

  const parts: DiffPart[] = [];
  for (let k = stack.length - 1; k >= 0; k -= 1) {
    const part = stack[k]!;
    const last = parts[parts.length - 1];
    if (
      last &&
      Boolean(last.added) === Boolean(part.added) &&
      Boolean(last.removed) === Boolean(part.removed)
    ) {
      last.value += part.value;
    } else {
      parts.push({ ...part });
    }
  }
  return parts;
}

function DiffPane({
  title,
  parts,
  side,
  className,
}: {
  title: string;
  parts: DiffPart[];
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
        <DiffPane
          title="Aktuell"
          parts={[{ value: after }]}
          side="after"
          className={layout === "stack" ? "min-h-[12rem]" : undefined}
        />
      ) : layout === "stack" ? (
        <div className="flex min-h-0 flex-col gap-3">
          <DiffPane title="Vorher" parts={parts} side="before" />
          <DiffPane title="Nachher" parts={parts} side="after" />
        </div>
      ) : (
        <div className="grid min-h-0 gap-3 md:grid-cols-2">
          <DiffPane title="Vorher" parts={parts} side="before" />
          <DiffPane title="Nachher" parts={parts} side="after" />
        </div>
      )}
    </div>
  );
}
