"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowLeftIcon,
  InboxIcon,
  PaperclipIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  markStaffMessageRead,
  replyToStaffMessage,
  setStaffMessageStatus,
} from "@/lib/staff-messages/actions";
import {
  formatFileSize,
  formatStaffMessageDueDate,
  priorityLabel,
  STAFF_MESSAGE_INBOX_STATUSES,
  STAFF_MESSAGE_PRIORITIES,
  STAFF_MESSAGE_STATUSES,
  statusLabel,
  type StaffMessageRecord,
} from "@/lib/staff-messages/types";
import { cn } from "@/lib/utils";
import type {
  StaffMessagePriority,
  StaffMessageStatus,
} from "@/lib/db/schema";

type PriorityFilter = "alle" | StaffMessagePriority;
type StatusFilter = "alle" | StaffMessageStatus;
type Mailbox = "received" | "delegated";

const PRIORITY_FILTERS: { id: PriorityFilter; label: string }[] = [
  { id: "alle", label: "Alle" },
  ...STAFF_MESSAGE_PRIORITIES.map((entry) => ({
    id: entry.value as PriorityFilter,
    label: entry.label,
  })),
];

const RECEIVED_STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "alle", label: "Alle Status" },
  ...STAFF_MESSAGE_INBOX_STATUSES.map((value) => ({
    id: value as StatusFilter,
    label: statusLabel(value),
  })),
];

const DELEGATED_STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "alle", label: "Alle Status" },
  ...STAFF_MESSAGE_STATUSES.map((entry) => ({
    id: entry.value as StatusFilter,
    label: entry.label,
  })),
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

function formatListDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function bodySnippet(body: string): string {
  const compact = body.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "Keine Nachricht";
  }
  return compact.length > 90 ? `${compact.slice(0, 90)}…` : compact;
}

function priorityBadgeClass(priority: StaffMessageRecord["priority"]): string {
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

function statusBadgeClass(status: StaffMessageStatus): string {
  switch (status) {
    case "offen":
      return "border-sky-500/40 bg-sky-500/10 text-sky-950 dark:text-sky-100";
    case "in_bearbeitung":
      return "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100";
    case "erledigt":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100";
    case "zurueckgestellt":
      return "border-slate-500/40 bg-slate-500/10 text-slate-950 dark:text-slate-100";
    default:
      return "border-border/70 bg-muted/50 text-foreground";
  }
}

export function InboxView({
  receivedMessages = [],
  delegatedMessages = [],
  currentUserId,
}: {
  receivedMessages?: StaffMessageRecord[];
  delegatedMessages?: StaffMessageRecord[];
  currentUserId: string;
}) {
  const received = receivedMessages;
  const delegated = delegatedMessages;

  const [mailbox, setMailbox] = useState<Mailbox>("received");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("alle");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle");

  const mailboxMessages =
    mailbox === "received" ? received : delegated;

  const statusFilters =
    mailbox === "received" ? RECEIVED_STATUS_FILTERS : DELEGATED_STATUS_FILTERS;

  const filteredMessages = useMemo(() => {
    return mailboxMessages.filter((message) => {
      if (
        priorityFilter !== "alle" &&
        message.priority !== priorityFilter
      ) {
        return false;
      }
      if (statusFilter !== "alle" && message.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [mailboxMessages, priorityFilter, statusFilter]);

  const priorityCounts = useMemo(() => {
    const counts: Record<PriorityFilter, number> = {
      alle: mailboxMessages.length,
      sofort: 0,
      heute: 0,
      diese_woche: 0,
      keine: 0,
      andere: 0,
    };
    for (const message of mailboxMessages) {
      counts[message.priority] += 1;
    }
    return counts;
  }, [mailboxMessages]);

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<StatusFilter, number>> = {
      alle: mailboxMessages.length,
    };
    for (const entry of statusFilters) {
      if (entry.id === "alle") continue;
      counts[entry.id] = 0;
    }
    for (const message of mailboxMessages) {
      const key = message.status as StatusFilter;
      if (key in counts && key !== "alle") {
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    return counts as Record<StatusFilter, number>;
  }, [mailboxMessages, statusFilters]);

  useEffect(() => {
    setStatusFilter("alle");
    setPriorityFilter("alle");
  }, [mailbox]);

  useEffect(() => {
    if (filteredMessages.length === 0) {
      setSelectedId(null);
      return;
    }

    setSelectedId((current) => {
      if (current && filteredMessages.some((message) => message.id === current)) {
        return current;
      }
      return filteredMessages[0]?.id ?? null;
    });
  }, [filteredMessages]);

  useEffect(() => {
    if (mailboxMessages.length === 0) {
      setMobileShowDetail(false);
    }
  }, [mailboxMessages.length]);

  const selected = useMemo(
    () => filteredMessages.find((message) => message.id === selectedId) ?? null,
    [selectedId, filteredMessages]
  );

  function selectMessage(id: string) {
    setSelectedId(id);
    setMobileShowDetail(true);
  }

  function handleLeftMailbox(completedId: string) {
    if (mailbox === "delegated") {
      return;
    }
    const remaining = filteredMessages.filter(
      (message) => message.id !== completedId
    );
    const nextId = remaining[0]?.id ?? null;
    setSelectedId(nextId);
    if (!nextId) {
      setMobileShowDetail(false);
    }
  }

  const emptyHint =
    mailbox === "received"
      ? "Sobald dir jemand über „Nachricht an Mitarbeiter“ schreibt, erscheint sie hier."
      : "Aufgaben, die du über „Nachricht an Mitarbeiter“ sendest, erscheinen hier — in jedem Status.";

  return (
    <div className="-mx-4 -my-8 flex min-h-[calc(100vh-4rem)] flex-1 flex-col overflow-x-hidden md:-mx-8 md:-my-10">
      <div className="grid min-h-0 flex-1 border-t border-border/60 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        <aside
          className={cn(
            "min-h-0 w-full flex-col border-border/60 bg-background/70 lg:flex lg:border-r",
            mobileShowDetail ? "hidden lg:flex" : "flex"
          )}
        >
          <div className="shrink-0 space-y-3 border-b border-border/60 px-4 py-4 md:px-5">
            <div className="space-y-1">
              <h1 className="font-heading text-lg font-medium tracking-tight">
                Nachrichten
              </h1>
              <p className="text-xs text-muted-foreground">
                {filteredMessages.length === 0
                  ? priorityFilter === "alle" && statusFilter === "alle"
                    ? mailbox === "received"
                      ? "Keine offenen Nachrichten"
                      : "Keine gesendeten Nachrichten"
                    : "Keine Nachrichten in diesem Filter"
                  : filteredMessages.length === 1
                    ? mailbox === "received"
                      ? "1 offen"
                      : "1 Aufgabe"
                    : mailbox === "received"
                      ? `${filteredMessages.length} offen`
                      : `${filteredMessages.length} Aufgaben`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setMailbox("received")}
                className={cn(
                  "rounded-none border px-2 py-2 text-xs font-medium transition-colors",
                  mailbox === "received"
                    ? "border-foreground bg-muted/50 text-foreground"
                    : "border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                )}
              >
                Eingang
                {received.length > 0 ? ` (${received.length})` : ""}
              </button>
              <button
                type="button"
                onClick={() => setMailbox("delegated")}
                className={cn(
                  "rounded-none border px-2 py-2 text-xs font-medium transition-colors",
                  mailbox === "delegated"
                    ? "border-foreground bg-muted/50 text-foreground"
                    : "border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                )}
              >
                Gesendet
                {delegated.length > 0 ? ` (${delegated.length})` : ""}
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {statusFilters.map((entry) => {
                  const count = statusCounts[entry.id] ?? 0;
                  const active = statusFilter === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setStatusFilter(entry.id)}
                      className={cn(
                        "rounded-none border px-2 py-1 text-[0.7rem] transition-colors",
                        active
                          ? "border-foreground bg-muted/50 text-foreground"
                          : "border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      )}
                    >
                      {entry.label}
                      {count > 0 ? ` (${count})` : ""}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITY_FILTERS.map((entry) => {
                  const count = priorityCounts[entry.id];
                  const active = priorityFilter === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setPriorityFilter(entry.id)}
                      className={cn(
                        "rounded-none border px-2 py-1 text-[0.7rem] transition-colors",
                        active
                          ? "border-foreground bg-muted/50 text-foreground"
                          : "border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      )}
                    >
                      {entry.label}
                      {count > 0 ? ` (${count})` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {mailboxMessages.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground md:px-5">
                {emptyHint}
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground md:px-5">
                Keine Nachrichten in diesem Filter.
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {filteredMessages.map((message) => (
                  <StaffMessageListItem
                    key={message.id}
                    message={message}
                    mailbox={mailbox}
                    selected={message.id === selectedId}
                    onSelect={() => selectMessage(message.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section
          className={cn(
            "min-h-0 flex-col bg-background/40",
            mobileShowDetail ? "flex" : "hidden lg:flex"
          )}
        >
          {selected ? (
            <StaffMessageWorkPane
              key={selected.id}
              message={selected}
              mailbox={mailbox}
              currentUserId={currentUserId}
              onBack={() => setMobileShowDetail(false)}
              onCompleted={() => handleLeftMailbox(selected.id)}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
              <InboxIcon className="size-8 opacity-50" />
              <p className="text-sm">
                {mailboxMessages.length === 0
                  ? mailbox === "received"
                    ? "Keine offenen Nachrichten."
                    : "Keine gesendeten Nachrichten."
                  : filteredMessages.length === 0
                    ? "Keine Nachrichten in diesem Filter."
                    : "Nachricht auswählen"}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StaffMessageListItem({
  message,
  mailbox,
  selected,
  onSelect,
}: {
  message: StaffMessageRecord;
  mailbox: Mailbox;
  selected: boolean;
  onSelect: () => void;
}) {
  const unread = mailbox === "received" && !message.readAt;
  const personLabel =
    mailbox === "delegated" ? message.recipientName : message.senderName;
  const personPrefix = mailbox === "delegated" ? "An" : null;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors md:px-5",
          selected
            ? "bg-muted/55"
            : "hover:bg-muted/30",
          unread && !selected ? "bg-sky-500/[0.04]" : null
        )}
      >
        <div className="flex items-start gap-2">
          {unread ? (
            <span
              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-sky-500"
              aria-hidden
            />
          ) : (
            <span className="mt-1.5 size-1.5 shrink-0" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p
                className={cn(
                  "truncate text-sm",
                  unread ? "font-semibold text-foreground" : "font-medium text-foreground/90"
                )}
              >
                {personPrefix ? `${personPrefix} ${personLabel}` : personLabel}
              </p>
              <span className="shrink-0 text-[0.7rem] tabular-nums text-muted-foreground">
                {formatListDate(message.createdAt)}
              </span>
            </div>
            <p
              className={cn(
                "truncate text-sm",
                unread ? "font-medium text-foreground" : "text-foreground/80"
              )}
            >
              {message.topic}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {bodySnippet(message.body)}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className={cn(
                  "rounded-none px-1.5 py-0 text-[0.65rem]",
                  statusBadgeClass(message.status)
                )}
              >
                {statusLabel(message.status)}
              </Badge>
              {message.priority !== "keine" ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-none px-1.5 py-0 text-[0.65rem]",
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
          </div>
        </div>
      </button>
    </li>
  );
}

function StaffMessageWorkPane({
  message,
  mailbox,
  currentUserId,
  onBack,
  onCompleted,
}: {
  message: StaffMessageRecord;
  mailbox: Mailbox;
  currentUserId: string;
  onBack: () => void;
  onCompleted: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reply, setReply] = useState("");
  const isRecipient = message.recipientId === currentUserId;

  useEffect(() => {
    if (mailbox !== "received" || message.readAt || !isRecipient) {
      return;
    }
    void markStaffMessageRead(message.id).then((result) => {
      if (result.success) {
        router.refresh();
      }
    });
  }, [
    mailbox,
    message.id,
    message.readAt,
    isRecipient,
    router,
  ]);

  function handleStatusChange(status: StaffMessageStatus) {
    if (status === message.status) {
      return;
    }
    startTransition(async () => {
      const result = await setStaffMessageStatus(message.id, status);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Status: ${statusLabel(status)}`);
      if (status === "erledigt" && mailbox === "received") {
        onCompleted();
      }
      router.refresh();
    });
  }

  function handleReply() {
    const body = reply.trim();
    if (!body) {
      toast.error("Bitte eine Rückmeldung eingeben.");
      return;
    }
    startTransition(async () => {
      const result = await replyToStaffMessage(message.id, body);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setReply("");
      toast.success("Rückmeldung gesendet.");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 border-b border-border/60 px-4 py-4 md:px-6">
        <div className="flex items-start gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0 lg:hidden"
            onClick={onBack}
            aria-label="Zurück zur Liste"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="font-heading text-xl font-medium tracking-tight">
              {message.topic}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {mailbox === "delegated" ? (
                <span>An {message.recipientName}</span>
              ) : (
                <span>Von {message.senderName}</span>
              )}
              <span>{formatInboxDate(message.createdAt)}</span>
              {message.dueDate ? (
                <span>Fällig {formatStaffMessageDueDate(message.dueDate)}</span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "rounded-none",
                  statusBadgeClass(message.status)
                )}
              >
                {statusLabel(message.status)}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-none",
                  priorityBadgeClass(message.priority)
                )}
              >
                {priorityLabel(message.priority)}
              </Badge>
              {mailbox === "received" && !message.readAt ? (
                <Badge
                  variant="outline"
                  className="rounded-none border-sky-500/40 bg-sky-500/10 text-sky-950 dark:text-sky-100"
                >
                  Neu
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 md:px-6">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Nachricht
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.body.trim() || "—"}
          </p>
        </div>

        {message.files.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Anhänge
            </p>
            <ul className="space-y-2">
              {message.files.map((file) => (
                <li key={file.id}>
                  <a
                    href={`/api/staff-messages/files/${file.id}`}
                    className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:underline"
                  >
                    <PaperclipIcon className="size-3.5 shrink-0" />
                    {file.filename}
                    <span className="text-muted-foreground">
                      ({formatFileSize(file.sizeBytes)})
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {message.replies.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Rückmeldungen
            </p>
            <ul className="space-y-3">
              {message.replies.map((entry) => (
                <li
                  key={entry.id}
                  className="border border-border/60 bg-muted/20 px-4 py-3"
                >
                  <p className="mb-1 text-xs text-muted-foreground">
                    {entry.authorName} · {formatInboxDate(entry.createdAt)}
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {entry.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 space-y-3 border-t border-border/60 bg-background/80 px-4 py-4 md:px-6">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Status
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STAFF_MESSAGE_STATUSES.map((entry) => {
              const active = message.status === entry.value;
              return (
                <button
                  key={entry.value}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleStatusChange(entry.value)}
                  className={cn(
                    "rounded-none border px-2.5 py-1.5 text-xs transition-colors disabled:opacity-60",
                    active
                      ? cn("border-foreground/40", statusBadgeClass(entry.value))
                      : "border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  )}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <label
            htmlFor={`staff-reply-${message.id}`}
            className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase"
          >
            Rückmeldung
          </label>
          <textarea
            id={`staff-reply-${message.id}`}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            rows={3}
            placeholder="Kurz antworten…"
            className="w-full rounded-none border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={isPending || !reply.trim()}
            onClick={handleReply}
            className="h-10 rounded-none px-4"
          >
            Rückmeldung senden
          </Button>
        </div>
      </div>
    </div>
  );
}
