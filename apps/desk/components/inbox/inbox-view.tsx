"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRightIcon,
  ClipboardListIcon,
  FolderOpenIcon,
  UserRoundIcon,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAreaBasePath } from "@/lib/area/use-area-path";
import type { InboxItem } from "@/lib/letters/types";
import type { LetterStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type InboxFilter = "alle" | "entwurf" | "zur_pruefung" | "freigegeben";

const FILTERS: { id: InboxFilter; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "entwurf", label: "Bearbeiten" },
  { id: "zur_pruefung", label: "Zur Prüfung" },
  { id: "freigegeben", label: "Versandbereit" },
];

function formatInboxDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function statusBadgeClass(status: Exclude<LetterStatus, "versendet">): string {
  switch (status) {
    case "entwurf":
      return "border-border/70 bg-muted/50 text-foreground";
    case "zur_pruefung":
      return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100";
    case "freigegeben":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100";
    default:
      return "border-border/70 bg-muted/50 text-foreground";
  }
}

function actionBadgeClass(status: Exclude<LetterStatus, "versendet">): string {
  switch (status) {
    case "entwurf":
      return "border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-100";
    case "zur_pruefung":
      return "border-violet-500/30 bg-violet-500/10 text-violet-950 dark:text-violet-100";
    case "freigegeben":
      return "border-emerald-600/30 bg-emerald-600/10 text-emerald-950 dark:text-emerald-100";
    default:
      return "border-border/70 bg-muted/50 text-foreground";
  }
}

export function InboxView({ items }: { items: InboxItem[] }) {
  const basePath = useAreaBasePath() ?? "";
  const [filter, setFilter] = useState<InboxFilter>("alle");

  const filtered = useMemo(() => {
    if (filter === "alle") {
      return items;
    }
    return items.filter((item) => item.status === filter);
  }, [filter, items]);

  const counts = useMemo(
    () => ({
      alle: items.length,
      entwurf: items.filter((item) => item.status === "entwurf").length,
      zur_pruefung: items.filter((item) => item.status === "zur_pruefung")
        .length,
      freigegeben: items.filter((item) => item.status === "freigegeben").length,
    }),
    [items]
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <PageHeader
        title="Eingang"
        description={
          items.length === 0
            ? "Keine offenen Aufgaben — zugewiesene Schreiben und Prüfungen erscheinen hier."
            : items.length === 1
              ? "1 offene Aufgabe — wer delegiert hat, was zu tun ist und der aktuelle Status."
              : `${items.length} offene Aufgaben — wer delegiert hat, was zu tun ist und der aktuelle Status.`
        }
      />

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((entry) => {
            const count = counts[entry.id];
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setFilter(entry.id)}
                className={cn(
                  "rounded-none border px-3 py-2 text-sm transition-colors",
                  filter === entry.id
                    ? "border-foreground bg-muted/40"
                    : "border-border/70 text-muted-foreground hover:border-foreground/25 hover:text-foreground"
                )}
              >
                {entry.label}
                {count > 0 ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="surface-card border-dashed p-10 text-center text-sm text-muted-foreground">
          Keine offenen Aufgaben. Sobald dir jemand ein Schreiben zuweist, erscheint
          es hier mit Anweisung und Status.
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-card border-dashed p-10 text-center text-sm text-muted-foreground">
          Keine Aufgaben in diesem Filter.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="surface-card flex flex-col gap-4 p-5 md:p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-none">
                      {item.kindLabel}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn("rounded-none", statusBadgeClass(item.status))}
                    >
                      {item.statusLabel}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn("rounded-none", actionBadgeClass(item.status))}
                    >
                      {item.actionLabel}
                    </Badge>
                  </div>

                  <Link
                    href={`${basePath}/schreiben/${item.id}/bearbeiten`}
                    className="block font-heading text-lg font-medium tracking-tight hover:underline md:text-xl"
                  >
                    {item.title}
                  </Link>

                  {item.subject ? (
                    <p className="text-sm text-muted-foreground">{item.subject}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {item.assignedByName ? (
                      <span className="inline-flex items-center gap-1.5">
                        <UserRoundIcon className="size-3.5 shrink-0" />
                        Von {item.assignedByName}
                      </span>
                    ) : null}
                    <span>{formatInboxDate(item.updatedAt)}</span>
                  </div>

                  {item.clientName || item.matterTitle ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/80">
                      {item.clientName ? (
                        <span>{item.clientName}</span>
                      ) : null}
                      {item.clientName && item.matterTitle ? (
                        <span className="text-muted-foreground">·</span>
                      ) : null}
                      {item.matterTitle ? (
                        <span className="inline-flex items-center gap-1">
                          <FolderOpenIcon className="size-3.5 shrink-0 text-muted-foreground" />
                          {item.matterTitle}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <Button
                  asChild
                  className="h-10 shrink-0 rounded-none px-4 sm:mt-1"
                >
                  <Link href={`${basePath}/schreiben/${item.id}/bearbeiten`}>
                    Öffnen
                    <ArrowRightIcon data-icon="inline-end" className="size-4" />
                  </Link>
                </Button>
              </div>

              {item.assignmentNote.trim() ? (
                <div className="border border-border/60 bg-muted/25 px-4 py-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    <ClipboardListIcon className="size-3.5" />
                    Anweisung
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {item.assignmentNote}
                  </p>
                </div>
              ) : null}

              {item.matterId ? (
                <Link
                  href={`${basePath}/akten/${item.matterId}`}
                  className="inline-flex items-center gap-1.5 text-sm text-foreground/70 hover:underline"
                >
                  <FolderOpenIcon className="size-3.5" />
                  Zur Akte
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
