"use client";

import Link from "next/link";
import { MessagesSquareIcon } from "lucide-react";

import type { MatterRecord } from "@/lib/clients/types";
import { AKTEN_CHAT_WITHOUT_MATTER_SLUG } from "@/lib/ai/matter-chat/paths";

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
  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`${basePath}/akten-chat/${AKTEN_CHAT_WITHOUT_MATTER_SLUG}`}
        className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--b-line)] bg-[var(--b-bg-elev)] px-5 py-4 transition-colors hover:bg-[var(--b-soft)]"
      >
        <span className="min-w-0">
          <span className="block font-medium text-[var(--b-ink)]">
            Nicht zugeordnet
          </span>
          <span className="b-meta">
            Chat ohne Akte starten — erscheint auch unter Akten.
          </span>
        </span>
        <MessagesSquareIcon
          className="size-5 shrink-0 text-[var(--b-muted)]"
          aria-hidden
        />
      </Link>

      {matters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--b-line)] bg-[var(--b-soft)]/40 px-6 py-12 text-center">
          <p className="b-meta">
            Noch keine Akten. Lege zuerst unter Mandanten eine Akte an — oder
            starte oben ohne Akte.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {matters.map((matter) => (
            <li key={matter.id}>
              <Link
                href={`${basePath}/akten-chat/${matter.id}`}
                className="flex h-full flex-col gap-2 rounded-2xl border border-[var(--b-line)] bg-[var(--b-bg-elev)] p-5 transition-colors hover:bg-[var(--b-soft)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-[var(--b-ink)]">
                    {matter.title}
                  </p>
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
      )}
    </div>
  );
}
