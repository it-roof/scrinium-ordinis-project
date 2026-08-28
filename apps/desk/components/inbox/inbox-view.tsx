"use client";

import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { useAreaBasePath } from "@/lib/area/use-area-path";
import type { InboxItem } from "@/lib/clients/types";

export function InboxView({ items }: { items: InboxItem[] }) {
  const basePath = useAreaBasePath() ?? "";
  const openCount = items.length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <PageHeader
        title="Eingang"
        description={
          openCount === 0
            ? "Keine offenen Aufgaben."
            : openCount === 1
              ? "1 offene Aufgabe — zugewiesene Schreiben und Prüfungen."
              : `${openCount} offene Aufgaben — zugewiesene Schreiben und Prüfungen.`
        }
      />

      {items.length === 0 ? (
        <div className="surface-card border-dashed p-10 text-center text-sm text-muted-foreground">
          Keine offenen Aufgaben.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="surface-card space-y-1 p-5">
              <Link
                href={`${basePath}/schreiben/${item.id}/bearbeiten`}
                className="font-heading text-lg font-medium tracking-tight hover:underline"
              >
                {item.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.statusLabel}
                {item.clientName ? ` · ${item.clientName}` : ""}
                {item.matterTitle ? ` · ${item.matterTitle}` : ""}
              </p>
              {item.assignmentNote ? (
                <p className="text-sm text-foreground/80">
                  Anweisung: {item.assignmentNote}
                </p>
              ) : null}
              {item.matterId ? (
                <Link
                  href={`${basePath}/akten/${item.matterId}`}
                  className="inline-block text-sm text-foreground/70 hover:underline"
                >
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
