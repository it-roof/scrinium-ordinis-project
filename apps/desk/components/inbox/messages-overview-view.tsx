"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { useAreaBasePath } from "@/lib/area/use-area-path";
import {
  intentLabel,
  priorityBadgeClass,
  priorityLabel,
  type StaffMessageRecord,
} from "@/lib/staff-messages/types";
import { cn } from "@/lib/utils";

type Props = {
  messages: StaffMessageRecord[];
  currentUserId: string;
};

export function MessagesOverviewView({ messages, currentUserId }: Props) {
  const basePath = useAreaBasePath();
  const [onlyOpen, setOnlyOpen] = useState(true);

  const filtered = useMemo(() => {
    const list = onlyOpen ? messages.filter((m) => !m.closedAt) : messages;
    return list;
  }, [messages, onlyOpen]);

  return (
    <div className="space-y-6 px-4 py-8">
      <PageHeader
        title="Aufträge — Übersicht"
        description="Alle Aufträge, an denen du beteiligt bist."
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOnlyOpen(true)}
          className={cn(
            "rounded-none border px-3 py-2 text-sm",
            onlyOpen ? "border-foreground bg-muted" : "border-border"
          )}
        >
          Nur offen
        </button>
        <button
          type="button"
          onClick={() => setOnlyOpen(false)}
          className={cn(
            "rounded-none border px-3 py-2 text-sm",
            !onlyOpen ? "border-foreground bg-muted" : "border-border"
          )}
        >
          Alle
        </button>
      </div>

      <ul className="divide-y border border-border">
        {filtered.length === 0 ? (
          <li className="px-4 py-8 text-sm text-muted-foreground">
            Keine Aufträge.
          </li>
        ) : (
          filtered.map((message) => {
            const href =
              message.ballHolderId === currentUserId
                ? `${basePath}/eingang?message=${message.id}`
                : `${basePath}/gesendet`;
            return (
              <li key={message.id}>
                <Link
                  href={href}
                  className="block px-4 py-4 hover:bg-muted/40"
                >
                  <div className="font-medium">{message.topic}</div>
                  {message.matterTitle ? (
                    <div className="mt-1 text-sm text-muted-foreground">
                      Akte:{" "}
                      {message.matterClientName
                        ? `${message.matterClientName} — `
                        : ""}
                      {message.matterTitle}
                    </div>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      {message.closedAt
                        ? "Fertig"
                        : `Ball: ${message.ballHolderName} · ${intentLabel(message.intent)}`}
                    </span>
                    <span aria-hidden>·</span>
                    <span
                      className={cn(
                        "inline-flex border px-1.5 py-0 text-xs",
                        priorityBadgeClass(message.priority)
                      )}
                    >
                      {priorityLabel(message.priority)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
