"use client";

import Link from "next/link";
import { MessagesSquareIcon } from "lucide-react";

import type { MatterRecord } from "@/lib/clients/types";

export type AktenChatMatterOption = MatterRecord & {
  consentGranted: boolean;
};

export function AktenChatMatterPicker({
  matters,
  basePath,
}: {
  matters: AktenChatMatterOption[];
  /** z. B. /r */
  basePath: string;
}) {
  if (matters.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--b-line)] bg-[var(--b-soft)]/40 px-6 py-12 text-center">
        <p className="b-meta">
          Noch keine Akten. Lege zuerst unter Mandanten eine Akte an.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {matters.map((matter) => (
        <li key={matter.id}>
          <Link
            href={`${basePath}/akten-chat/${matter.id}`}
            className="flex h-full flex-col gap-2 rounded-2xl border border-[var(--b-line)] bg-[var(--b-bg-elev)] p-5 transition-colors hover:bg-[var(--b-soft)]"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-[var(--b-ink)]">{matter.title}</p>
              <MessagesSquareIcon
                className="size-5 shrink-0 text-[var(--b-muted)]"
                aria-hidden
              />
            </div>
            <p className="b-meta">
              {matter.clientName}
              {matter.reference ? ` · ${matter.reference}` : ""}
            </p>
            <p
              className={
                matter.consentGranted
                  ? "text-xs text-emerald-800"
                  : "text-xs text-amber-800"
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
