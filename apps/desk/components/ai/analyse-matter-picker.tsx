"use client";

import Link from "next/link";
import { Scale } from "lucide-react";

import type { MatterRecord } from "@/lib/clients/types";

export type AnalyseMatterOption = MatterRecord & {
  consentGranted: boolean;
};

export function AnalyseMatterPicker({
  matters,
  basePath,
}: {
  matters: AnalyseMatterOption[];
  /** z. B. /r */
  basePath: string;
}) {
  if (matters.length === 0) {
    return (
      <div className="surface-card border-dashed p-8 text-center text-sm text-muted-foreground">
        Noch keine Akten. Lege zuerst unter Mandanten eine Akte an.
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {matters.map((matter) => (
        <li key={matter.id}>
          <Link
            href={`${basePath}/analyse/${matter.id}`}
            className="surface-card flex h-full flex-col gap-2 p-5 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-heading text-lg font-medium tracking-tight">
                {matter.title}
              </p>
              <Scale className="size-5 shrink-0 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {matter.clientName}
              {matter.reference ? ` · ${matter.reference}` : ""}
            </p>
            <p
              className={
                matter.consentGranted
                  ? "text-xs text-emerald-700"
                  : "text-xs text-amber-700"
              }
            >
              {matter.consentGranted
                ? "KI-Einwilligung erteilt"
                : "Keine KI-Einwilligung"}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
