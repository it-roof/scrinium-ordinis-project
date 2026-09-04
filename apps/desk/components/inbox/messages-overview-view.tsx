"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, PaperclipIcon } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAreaBasePath } from "@/lib/area/use-area-path";
import type { StaffMessagePriority, StaffMessageStatus } from "@/lib/db/schema";
import {
  formatStaffMessageDueDate,
  priorityLabel,
  STAFF_MESSAGE_COMPOSE_PRIORITIES,
  STAFF_MESSAGE_STATUSES,
  statusLabel,
  type StaffMessageRecord,
} from "@/lib/staff-messages/types";
import { cn } from "@/lib/utils";

type DirectionFilter = "alle" | "empfangen" | "delegiert";
type StatusFilter = "alle" | StaffMessageStatus;
type PriorityFilter = "alle" | StaffMessagePriority;
type ReadFilter = "alle" | "ungelesen" | "gelesen";

const DIRECTION_FILTERS: { id: DirectionFilter; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "empfangen", label: "Empfangen" },
  { id: "delegiert", label: "Delegiert" },
];

const READ_FILTERS: { id: ReadFilter; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "ungelesen", label: "Ungelesen" },
  { id: "gelesen", label: "Gelesen" },
];

function formatOverviewDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function statusBadgeClass(status: StaffMessageStatus): string {
  switch (status) {
    case "offen":
      return "border-sky-500/40 bg-sky-500/10 text-sky-950 dark:text-sky-100";
    case "in_bearbeitung":
      return "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100";
    case "erledigt":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100";
    default:
      return "border-border/70 bg-muted/50 text-foreground";
  }
}

function priorityBadgeClass(priority: StaffMessagePriority): string {
  switch (priority) {
    case "sofort":
      return "border-rose-500/40 bg-rose-500/10 text-rose-950 dark:text-rose-100";
    case "heute":
      return "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100";
    case "diese_woche":
      return "border-sky-500/40 bg-sky-500/10 text-sky-950 dark:text-sky-100";
    case "andere":
      return "border-violet-500/40 bg-violet-500/10 text-violet-950 dark:text-violet-100";
    default:
      return "border-border/70 bg-muted/50 text-foreground";
  }
}

function bodySnippet(body: string): string {
  const compact = body.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "—";
  }
  return compact.length > 140 ? `${compact.slice(0, 140)}…` : compact;
}

export function MessagesOverviewView({
  messages,
  currentUserId,
}: {
  messages: StaffMessageRecord[];
  currentUserId: string;
}) {
  const basePath = useAreaBasePath() ?? "";
  const [direction, setDirection] = useState<DirectionFilter>("alle");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("alle");
  const [readFilter, setReadFilter] = useState<ReadFilter>("alle");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const enriched = useMemo(
    () =>
      messages.map((message) => ({
        message,
        direction:
          message.senderId === currentUserId
            ? ("delegiert" as const)
            : ("empfangen" as const),
      })),
    [currentUserId, messages]
  );

  const filtered = useMemo(() => {
    return enriched.filter(({ message, direction: itemDirection }) => {
      if (direction !== "alle" && itemDirection !== direction) {
        return false;
      }
      if (statusFilter !== "alle" && message.status !== statusFilter) {
        return false;
      }
      if (priorityFilter !== "alle" && message.priority !== priorityFilter) {
        return false;
      }
      if (readFilter === "ungelesen" && message.readAt) {
        return false;
      }
      if (readFilter === "gelesen" && !message.readAt) {
        return false;
      }
      return true;
    });
  }, [direction, enriched, priorityFilter, readFilter, statusFilter]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <PageHeader
        title="Nachrichten Verlauf"
        description="Verlauf aller empfangenen und delegierten Nachrichten und Aufgaben — inkl. Erledigt und Entfällt."
      />

      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {DIRECTION_FILTERS.map((entry) => (
            <FilterChip
              key={entry.id}
              label={entry.label}
              active={direction === entry.id}
              onClick={() => setDirection(entry.id)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {READ_FILTERS.map((entry) => (
            <FilterChip
              key={entry.id}
              label={entry.label}
              active={readFilter === entry.id}
              onClick={() => setReadFilter(entry.id)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            label="Alle Status"
            active={statusFilter === "alle"}
            onClick={() => setStatusFilter("alle")}
          />
          {STAFF_MESSAGE_STATUSES.map((entry) => (
            <FilterChip
              key={entry.value}
              label={entry.label}
              active={statusFilter === entry.value}
              onClick={() => setStatusFilter(entry.value)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            label="Alle Prioritäten"
            active={priorityFilter === "alle"}
            onClick={() => setPriorityFilter("alle")}
          />
          {STAFF_MESSAGE_COMPOSE_PRIORITIES.map((entry) => (
            <FilterChip
              key={entry.value}
              label={entry.label}
              active={priorityFilter === entry.value}
              onClick={() => setPriorityFilter(entry.value)}
            />
          ))}
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="surface-card border-dashed p-10 text-center text-sm text-muted-foreground">
          Noch keine Nachrichten. Über „Nachricht an Mitarbeiter“ kannst du
          Aufgaben anlegen.
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-card border-dashed p-10 text-center text-sm text-muted-foreground">
          Keine Einträge in diesem Filter.
        </div>
      ) : (
        <ul className="divide-y divide-border/60 border border-border/70 bg-background/50">
          {filtered.map(({ message, direction: itemDirection }) => {
            const open = expandedId === message.id;
            const canOpenInInbox =
              itemDirection === "empfangen" &&
              (message.status === "offen" ||
                message.status === "in_bearbeitung");

            return (
              <li key={message.id} className="bg-background/40">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId((current) =>
                      current === message.id ? null : message.id
                    )
                  }
                  className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/30 md:px-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className="rounded-none text-[0.65rem]"
                        >
                          {itemDirection === "delegiert"
                            ? "Delegiert"
                            : "Empfangen"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-none text-[0.65rem]",
                            statusBadgeClass(message.status)
                          )}
                        >
                          {statusLabel(message.status)}
                        </Badge>
                        {message.priority !== "keine" ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-none text-[0.65rem]",
                              priorityBadgeClass(message.priority)
                            )}
                          >
                            {priorityLabel(message.priority)}
                          </Badge>
                        ) : null}
                        {message.files.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                            <PaperclipIcon className="size-3" />
                            {message.files.length}
                          </span>
                        ) : null}
                      </div>
                      <p className="font-heading text-base font-medium tracking-tight">
                        {message.topic}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {itemDirection === "delegiert"
                          ? `An ${message.recipientName}`
                          : `Von ${message.senderName}`}
                        {" · "}
                        {formatOverviewDate(message.createdAt)}
                        {message.dueDate
                          ? ` · Fällig ${formatStaffMessageDueDate(message.dueDate)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  {!open ? (
                    <p className="text-sm text-muted-foreground">
                      {bodySnippet(message.body)}
                    </p>
                  ) : null}
                </button>

                {open ? (
                  <div className="space-y-4 border-t border-border/50 px-4 py-4 md:px-5">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.body.trim() || "—"}
                    </p>
                    {message.files.length > 0 ? (
                      <ul className="space-y-1">
                        {message.files.map((file) => (
                          <li key={file.id}>
                            <a
                              href={`/api/staff-messages/files/${file.id}`}
                              className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:underline"
                            >
                              <PaperclipIcon className="size-3.5" />
                              {file.filename}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {message.replies.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                          Rückmeldungen ({message.replies.length})
                        </p>
                        <ul className="space-y-2">
                          {message.replies.map((reply) => (
                            <li
                              key={reply.id}
                              className="border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                            >
                              <p className="mb-1 text-xs text-muted-foreground">
                                {reply.authorName} ·{" "}
                                {formatOverviewDate(reply.createdAt)}
                              </p>
                              <p className="whitespace-pre-wrap">{reply.body}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {canOpenInInbox ? (
                      <Button asChild className="h-9 rounded-none px-3">
                        <Link href={`${basePath}/eingang`}>
                          In Nachrichten öffnen
                          <ArrowRightIcon
                            data-icon="inline-end"
                            className="size-4"
                          />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-none border px-2 py-1 text-[0.7rem] transition-colors",
        active
          ? "border-foreground bg-muted/50 text-foreground"
          : "border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}
