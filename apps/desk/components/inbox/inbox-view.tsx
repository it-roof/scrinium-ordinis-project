"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import {
  ArrowLeftIcon,
  InboxIcon,
  PaperclipIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAreaFromPath } from "@/lib/area/use-area-path";
import {
  handOffStaffMessage,
  markStaffMessageRead,
  replyToStaffMessage,
  setStaffMessageStatus,
} from "@/lib/staff-messages/actions";
import {
  STAFF_INBOX_LIVE_EVENT,
  staffInboxPollIntervalMs,
  type StaffInboxLiveDetail,
} from "@/lib/staff-messages/inbox-live";
import {
  formatFileSize,
  formatStaffMessageDueDate,
  compareStaffMessagesByPriority,
  priorityLabel,
  STAFF_MESSAGE_INBOX_STATUSES,
  STAFF_MESSAGE_STATUSES,
  statusLabel,
  type StaffMessageRecord,
} from "@/lib/staff-messages/types";
import { cn } from "@/lib/utils";
import type { StaffMessageStatus } from "@/lib/db/schema";

type StatusFilter = StaffMessageStatus;

const INBOX_STATUS_FILTERS: { id: StatusFilter; label: string }[] =
  STAFF_MESSAGE_INBOX_STATUSES.map((value) => ({
    id: value,
    label: statusLabel(value),
  }));

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

export function InboxView({
  receivedMessages = [],
  currentUserId,
}: {
  receivedMessages?: StaffMessageRecord[];
  currentUserId: string;
}) {
  const area = useAreaFromPath();
  const [messages, setMessages] = useState(receivedMessages);

  useEffect(() => {
    setMessages(receivedMessages);
  }, [receivedMessages]);

  useEffect(() => {
    if (!area) {
      return;
    }

    const moduleId = area;
    let cancelled = false;
    let timer: number | undefined;

    async function refreshLists() {
      try {
        const response = await fetch(
          `/api/staff-messages/inbox?module=${encodeURIComponent(moduleId)}`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          }
        );
        if (!response.ok || cancelled) {
          return;
        }
        const data = (await response.json()) as {
          received: StaffMessageRecord[];
        };
        if (cancelled) {
          return;
        }
        setMessages(data.received);
      } catch {
        // nächster Poll
      }
    }

    const schedule = () => {
      window.clearTimeout(timer);
      const delay = staffInboxPollIntervalMs({
        documentHidden: document.visibilityState === "hidden",
        onInboxPage: true,
      });
      timer = window.setTimeout(async () => {
        await refreshLists();
        if (!cancelled) {
          schedule();
        }
      }, delay);
    };

    const onLive = (event: Event) => {
      const detail = (event as CustomEvent<StaffInboxLiveDetail>).detail;
      if (detail) {
        void refreshLists();
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshLists().then(() => {
          if (!cancelled) {
            schedule();
          }
        });
      } else {
        schedule();
      }
    };

    window.addEventListener(STAFF_INBOX_LIVE_EVENT, onLive);
    document.addEventListener("visibilitychange", onVisible);
    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener(STAFF_INBOX_LIVE_EVENT, onLive);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [area]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("offen");

  const filteredMessages = useMemo(() => {
    return messages
      .filter((message) => message.status === statusFilter)
      .sort(compareStaffMessagesByPriority);
  }, [messages, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      offen: 0,
      spaeter: 0,
      erledigt: 0,
      entfaellt: 0,
    };
    for (const message of messages) {
      counts[message.status] += 1;
    }
    return counts;
  }, [messages]);

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
    if (messages.length === 0) {
      setMobileShowDetail(false);
    }
  }, [messages.length]);

  const selected = useMemo(
    () => filteredMessages.find((message) => message.id === selectedId) ?? null,
    [selectedId, filteredMessages]
  );

  function selectMessage(id: string) {
    setSelectedId(id);
    setMobileShowDetail(true);
  }

  function handleLeftMailbox(completedId: string) {
    const remaining = filteredMessages.filter(
      (message) => message.id !== completedId
    );
    const nextId = remaining[0]?.id ?? null;
    setSelectedId(nextId);
    if (!nextId) {
      setMobileShowDetail(false);
    }
  }

  return (
    <div className="-mx-4 -my-8 flex h-[calc(100dvh-var(--header-height))] flex-col overflow-hidden md:-mx-8 md:-my-10 md:h-[calc(100dvh-var(--header-height)-1rem)]">
      <div className="grid min-h-0 flex-1 grid-rows-1 border-t border-border/60 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        <aside
          className={cn(
            "flex h-full min-h-0 w-full flex-col overflow-hidden border-border/60 bg-background/70 lg:border-r",
            mobileShowDetail ? "hidden lg:flex" : "flex"
          )}
        >
          <div className="shrink-0 space-y-3 border-b border-border/60 px-4 py-4 md:px-5">
            <div className="space-y-1">
              <h1 className="font-heading text-lg font-medium tracking-tight">
                Alle Nachrichten
              </h1>
              <p className="text-xs text-muted-foreground">
                {filteredMessages.length === 0
                  ? "Keine Nachrichten in diesem Status"
                  : filteredMessages.length === 1
                    ? "1 Nachricht"
                    : `${filteredMessages.length} Nachrichten`}
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Status"
              className="grid grid-cols-3 border border-border/70"
            >
              {INBOX_STATUS_FILTERS.map((entry, index) => {
                const count = statusCounts[entry.id] ?? 0;
                const active = statusFilter === entry.id;
                const showCount = entry.id === "offen" && count > 0;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStatusFilter(entry.id)}
                    className={cn(
                      "px-1.5 py-2 text-xs font-medium transition-colors",
                      index > 0 ? "border-l border-border/70" : null,
                      active
                        ? "bg-muted/60 text-foreground"
                        : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    )}
                  >
                    {entry.label}
                    {showCount ? (
                      <span className="tabular-nums"> ({count})</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {messages.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground md:px-5">
                Sobald dir jemand über „Nachricht an Mitarbeiter“ schreibt,
                erscheint sie hier.
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
            "h-full min-h-0 flex-col overflow-hidden bg-background/40",
            mobileShowDetail ? "flex" : "hidden lg:flex"
          )}
        >
          {selected ? (
            <StaffMessageWorkPane
              key={selected.id}
              message={selected}
              currentUserId={currentUserId}
              onBack={() => setMobileShowDetail(false)}
              onCompleted={() => handleLeftMailbox(selected.id)}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
              <InboxIcon className="size-8 opacity-50" />
              <p className="text-sm">
                {messages.length === 0
                  ? "Keine offenen Nachrichten."
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
  selected,
  onSelect,
}: {
  message: StaffMessageRecord;
  selected: boolean;
  onSelect: () => void;
}) {
  const unread = !message.readAt;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors md:px-5",
          selected ? "bg-muted/55" : "hover:bg-muted/30",
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
                  unread
                    ? "font-semibold text-foreground"
                    : "font-medium text-foreground/90"
                )}
              >
                {message.senderName}
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
            {message.priority !== "keine" || message.files.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
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
            ) : null}
          </div>
        </div>
      </button>
    </li>
  );
}

function StaffMessageWorkPane({
  message,
  currentUserId,
  onBack,
  onCompleted,
}: {
  message: StaffMessageRecord;
  currentUserId: string;
  onBack: () => void;
  onCompleted: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reply, setReply] = useState("");
  const threadEndRef = useRef<HTMLDivElement>(null);
  const isRecipient = message.recipientId === currentUserId;

  useEffect(() => {
    if (message.readAt || !isRecipient) {
      return;
    }
    void markStaffMessageRead(message.id).then((result) => {
      if (result.success) {
        router.refresh();
      }
    });
  }, [message.id, message.readAt, isRecipient, router]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [message.id, message.replies.length]);

  function handleStatusChange(status: StaffMessageStatus) {
    if (status === message.status) {
      return;
    }

    const note = reply.trim();
    if (status === "spaeter" && !note) {
      toast.error(
        "Bitte zuerst eine Notiz eingeben, warum die Nachricht auf Später gesetzt wird."
      );
      return;
    }

    startTransition(async () => {
      const result = await setStaffMessageStatus(
        message.id,
        status,
        status === "spaeter" ? note : undefined
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (status === "spaeter") {
        setReply("");
      }
      toast.success(`Status: ${statusLabel(status)}`);
      if (status === "entfaellt") {
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
      toast.success("Notiz gespeichert.");
      router.refresh();
    });
  }

  function handleHandOff() {
    const note = reply.trim();
    if (!note) {
      toast.error(
        "Bitte eine Notiz eingeben, bevor du die Aufgabe zurücksendest."
      );
      return;
    }
    startTransition(async () => {
      const result = await handOffStaffMessage(message.id, note);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setReply("");
      toast.success(`Zurückgesendet an ${message.senderName}.`);
      onCompleted();
      router.refresh();
    });
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isPending && reply.trim()) {
        handleHandOff();
      }
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border/60 px-4 py-3 md:px-6">
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
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="font-heading text-lg font-medium tracking-tight">
                {message.topic}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5">
                {!message.readAt ? (
                  <Badge
                    variant="outline"
                    className="rounded-none border-sky-500/40 bg-sky-500/10 text-sky-950 dark:text-sky-100"
                  >
                    Neu
                  </Badge>
                ) : null}
                {message.priority !== "keine" ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-none",
                      priorityBadgeClass(message.priority)
                    )}
                  >
                    {priorityLabel(message.priority)}
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>Von {message.senderName}</span>
              {message.dueDate ? (
                <span>Fällig {formatStaffMessageDueDate(message.dueDate)}</span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor={`staff-status-${message.id}`}
                className="text-xs text-muted-foreground"
              >
                Status
              </label>
              <select
                id={`staff-status-${message.id}`}
                value={message.status}
                disabled={isPending}
                onChange={(event) =>
                  handleStatusChange(event.target.value as StaffMessageStatus)
                }
                className="h-8 max-w-[12rem] rounded-none border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60"
              >
                {STAFF_MESSAGE_STATUSES.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 md:px-6">
        <ThreadBubble
          own={message.senderId === currentUserId}
          authorName={message.senderName}
          createdAt={message.createdAt}
          body={message.body}
          files={message.files}
        />
        {message.replies.map((entry) => (
          <ThreadBubble
            key={entry.id}
            own={entry.authorId === currentUserId}
            authorName={entry.authorName}
            createdAt={entry.createdAt}
            body={entry.body}
          />
        ))}
        <div ref={threadEndRef} />
      </div>

      <div className="shrink-0 space-y-3 border-t border-border/60 bg-background/90 px-4 py-4 md:px-6">
        <div className="space-y-2">
          <label
            htmlFor={`staff-reply-${message.id}`}
            className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase"
          >
            Notiz
          </label>
          <textarea
            id={`staff-reply-${message.id}`}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            onKeyDown={onComposerKeyDown}
            rows={3}
            placeholder={`Notiz für ${message.senderName}… (Enter = zurücksenden)`}
            className="w-full rounded-none border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={isPending || !reply.trim()}
            onClick={handleHandOff}
            className="h-10 rounded-none px-4"
          >
            Zurücksenden an {message.senderName}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending || !reply.trim()}
            onClick={handleReply}
            className="h-10 rounded-none px-4"
          >
            Nur Notiz speichern
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Zurücksenden gibt die Aufgabe an {message.senderName} — sie erscheint
          dort wieder unter Offen. „Später“ braucht ebenfalls eine Notiz.
        </p>
      </div>
    </div>
  );
}

function ThreadBubble({
  own,
  authorName,
  createdAt,
  body,
  files = [],
}: {
  own: boolean;
  authorName: string;
  createdAt: string;
  body: string;
  files?: StaffMessageRecord["files"];
}) {
  return (
    <div className={cn("flex", own ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[min(100%,28rem)] space-y-2 border px-3.5 py-2.5",
          own
            ? "border-foreground/15 bg-muted/50"
            : "border-border/70 bg-background"
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-xs font-medium text-foreground">{authorName}</p>
          <p className="text-[0.65rem] tabular-nums text-muted-foreground">
            {formatInboxDate(createdAt)}
          </p>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {body.trim() || "—"}
        </p>
        {files.length > 0 ? (
          <ul className="space-y-1 border-t border-border/50 pt-2">
            {files.map((file) => (
              <li key={file.id}>
                <a
                  href={`/api/staff-messages/files/${file.id}`}
                  className="inline-flex items-center gap-1.5 text-xs text-foreground/80 hover:underline"
                >
                  <PaperclipIcon className="size-3 shrink-0" />
                  {file.filename}
                  <span className="text-muted-foreground">
                    ({formatFileSize(file.sizeBytes)})
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
