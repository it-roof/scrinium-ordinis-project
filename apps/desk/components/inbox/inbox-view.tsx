"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
import {
  ArrowLeftIcon,
  ArrowUpDownIcon,
  CheckIcon,
  DownloadIcon,
  InboxIcon,
  ListFilterIcon,
  MicIcon,
  MicOffIcon,
  PaperclipIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAreaFromPath } from "@/lib/area/use-area-path";
import {
  blockJoinPrefix,
  flattenBlocks,
  mergeSessionIntoInput,
  speechDisplayText,
  type DictationBlock,
} from "@/lib/prompt-kit/dictation";
import { usePromptKitDictation } from "@/lib/prompt-kit/use-dictation";
import {
  deleteStaffMessage,
  markStaffMessageRead,
  setStaffMessageStatus,
} from "@/lib/staff-messages/actions";
import {
  STAFF_INBOX_LIVE_EVENT,
  staffInboxPollIntervalMs,
  type StaffInboxLiveDetail,
} from "@/lib/staff-messages/inbox-live";
import {
  compareStaffMessagesByPriority,
  formatFileSize,
  formatStaffMessageDueDate,
  priorityLabel,
  STAFF_MESSAGE_ACTIVE_STATUSES,
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

type InboxMailbox = "eingang" | "gesendet";
type InboxFilter = "offen" | "erledigt";
type PriorityFilter = "alle" | StaffMessagePriority;
type SortMode = "priority" | "newest";

const INBOX_FILTERS: { id: InboxFilter; label: string }[] = [
  { id: "offen", label: "Offen" },
  { id: "erledigt", label: "Erledigt" },
];

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: "priority", label: "Priorität" },
  { id: "newest", label: "Neueste" },
];

const PRIORITY_FILTERS: { id: PriorityFilter; label: string }[] = [
  { id: "alle", label: "Alle" },
  ...STAFF_MESSAGE_PRIORITIES.filter(
    (entry) => entry.value !== "keine" && entry.value !== "andere"
  ).map(
    (entry) => ({ id: entry.value as PriorityFilter, label: entry.label })
  ),
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

function isActiveStatus(status: StaffMessageRecord["status"]): boolean {
  return (STAFF_MESSAGE_ACTIVE_STATUSES as readonly string[]).includes(status);
}

function matchesMailboxFilter(
  message: StaffMessageRecord,
  mailbox: InboxMailbox,
  filter: InboxFilter,
  currentUserId: string
): boolean {
  if (mailbox === "eingang") {
    if (message.recipientId !== currentUserId) {
      return false;
    }
    if (filter === "offen") {
      return isActiveStatus(message.status);
    }
    return message.status === "erledigt";
  }

  // gesendet
  if (message.senderId !== currentUserId) {
    return false;
  }
  if (filter === "offen") {
    return isActiveStatus(message.status);
  }
  return message.status === "erledigt";
}

function mailboxMessages(
  mailbox: InboxMailbox,
  received: StaffMessageRecord[],
  delegated: StaffMessageRecord[]
): StaffMessageRecord[] {
  if (mailbox === "eingang") {
    return received;
  }
  return delegated;
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
    case "in_bearbeitung":
      return "border-sky-500/40 bg-sky-500/10 text-sky-950 dark:text-sky-100";
    case "erledigt":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100";
    default:
      return "border-border/70 bg-muted/50 text-foreground";
  }
}

const EMPTY_STAFF_MESSAGES: StaffMessageRecord[] = [];

export function InboxView({
  mailbox,
  receivedMessages = EMPTY_STAFF_MESSAGES,
  delegatedMessages = EMPTY_STAFF_MESSAGES,
  currentUserId,
  initialPriority = null,
  initialFilter = null,
  initialUnreadOnly = false,
  initialMessageId = null,
}: {
  mailbox: InboxMailbox;
  receivedMessages?: StaffMessageRecord[];
  delegatedMessages?: StaffMessageRecord[];
  currentUserId: string;
  /** Aus Übersicht-Karten, z. B. ?priority=sofort */
  initialPriority?: StaffMessagePriority | null;
  /** Aus Übersicht, z. B. ?filter=erledigt */
  initialFilter?: InboxFilter | null;
  /** Aus Übersicht, z. B. ?unread=1 */
  initialUnreadOnly?: boolean;
  /** Direkte Auswahl, z. B. ?message=… */
  initialMessageId?: string | null;
}) {
  const area = useAreaFromPath();
  const [messages, setMessages] = useState(() =>
    mailboxMessages(mailbox, receivedMessages, delegatedMessages)
  );

  useEffect(() => {
    setMessages(mailboxMessages(mailbox, receivedMessages, delegatedMessages));
  }, [mailbox, receivedMessages, delegatedMessages]);

  // Inbox-Live-Polling
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
          delegated?: StaffMessageRecord[];
        };
        if (cancelled) {
          return;
        }
        setMessages(
          mailboxMessages(mailbox, data.received, data.delegated ?? [])
        );
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
  }, [area, mailbox]);

  const [selectedId, setSelectedId] = useState<string | null>(
    () => initialMessageId
  );
  const [mobileShowDetail, setMobileShowDetail] = useState(
    () => initialMessageId != null
  );
  const [statusFilter, setStatusFilter] = useState<InboxFilter>(
    () => initialFilter ?? "offen"
  );
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>(
    () => initialPriority ?? "alle"
  );
  const [unreadOnly, setUnreadOnly] = useState(() => initialUnreadOnly);
  const [priorityFiltersOpen, setPriorityFiltersOpen] = useState(
    () => initialPriority != null || initialUnreadOnly
  );
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [sortOpen, setSortOpen] = useState(false);
  const showPriorityFilters =
    priorityFiltersOpen || priorityFilter !== "alle" || unreadOnly;

  useEffect(() => {
    if (initialFilter) {
      setStatusFilter(initialFilter);
    }
    if (initialPriority) {
      setPriorityFilter(initialPriority);
      setPriorityFiltersOpen(true);
      if (!initialFilter) {
        setStatusFilter("offen");
      }
    }
    if (initialUnreadOnly) {
      setUnreadOnly(true);
      setPriorityFiltersOpen(true);
      if (!initialFilter) {
        setStatusFilter("offen");
      }
    }
    if (initialMessageId) {
      setSelectedId(initialMessageId);
      setMobileShowDetail(true);
    }
  }, [initialFilter, initialPriority, initialUnreadOnly, initialMessageId]);

  const filteredMessages = useMemo(() => {
    const filtered = messages
      .filter((message) =>
        matchesMailboxFilter(message, mailbox, statusFilter, currentUserId)
      )
      .filter(
        (message) =>
          priorityFilter === "alle" || message.priority === priorityFilter
      )
      .filter((message) => {
        if (!unreadOnly) {
          return true;
        }
        return !message.readAt && message.recipientId === currentUserId;
      });

    return [...filtered].sort((a, b) => {
      if (sortMode === "newest") {
        return b.createdAt.localeCompare(a.createdAt);
      }
      return compareStaffMessagesByPriority(a, b);
    });
  }, [
    messages,
    mailbox,
    statusFilter,
    priorityFilter,
    unreadOnly,
    sortMode,
    currentUserId,
  ]);

  const statusCounts = useMemo(() => {
    const counts: Record<InboxFilter, number> = { offen: 0, erledigt: 0 };
    for (const message of messages) {
      if (matchesMailboxFilter(message, mailbox, "offen", currentUserId)) {
        counts.offen += 1;
      } else if (
        matchesMailboxFilter(message, mailbox, "erledigt", currentUserId)
      ) {
        counts.erledigt += 1;
      }
    }
    return counts;
  }, [messages, mailbox, currentUserId]);

  const priorityCounts = useMemo(() => {
    const inStatus = messages.filter((message) =>
      matchesMailboxFilter(message, mailbox, statusFilter, currentUserId)
    );
    const counts: Partial<Record<PriorityFilter, number>> = {
      alle: inStatus.length,
    };
    for (const message of inStatus) {
      counts[message.priority] = (counts[message.priority] ?? 0) + 1;
    }
    return counts;
  }, [messages, mailbox, statusFilter, currentUserId]);

  useEffect(() => {
    if (filteredMessages.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((current) => {
      if (
        current &&
        filteredMessages.some((message) => message.id === current)
      ) {
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
    () =>
      filteredMessages.find((message) => message.id === selectedId) ?? null,
    [selectedId, filteredMessages]
  );

  function selectMessage(id: string) {
    setSelectedId(id);
    setMobileShowDetail(true);
  }

  function handleLeftMailbox(leftId: string) {
    const remaining = filteredMessages.filter(
      (message) => message.id !== leftId
    );
    const nextId = remaining[0]?.id ?? null;
    setSelectedId(nextId);
    if (!nextId) {
      setMobileShowDetail(false);
    }
  }

  function handleDeleted(deletedId: string) {
    const remaining = filteredMessages.filter(
      (message) => message.id !== deletedId
    );
    setMessages((current) =>
      current.filter((message) => message.id !== deletedId)
    );
    const nextId = remaining[0]?.id ?? null;
    setSelectedId(nextId);
    if (!nextId) {
      setMobileShowDetail(false);
    }
  }

  function handleStatusSaved(updated: StaffMessageRecord) {
    setMessages((current) =>
      current.map((message) =>
        message.id === updated.id ? updated : message
      )
    );
    const stillInFilter = matchesMailboxFilter(
      updated,
      mailbox,
      statusFilter,
      currentUserId
    );
    if (!stillInFilter) {
      handleLeftMailbox(updated.id);
    }
  }

  return (
    <div className="-mx-4 -my-8 flex h-[calc(100dvh-var(--header-height))] flex-col overflow-hidden md:-mx-8 md:-my-10 md:h-[calc(100dvh-var(--header-height)-1rem)]">
      <div className="grid min-h-0 flex-1 grid-rows-1 border-t border-border/60 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        {/* Seitenleiste: Liste */}
        <aside
          className={cn(
            "flex h-full min-h-0 w-full flex-col overflow-hidden border-border/60 bg-background/70 lg:border-r",
            mobileShowDetail ? "hidden lg:flex" : "flex"
          )}
        >
          <div className="shrink-0 space-y-3 border-b border-border/60 px-4 py-4 md:px-5">
            <div className="space-y-1">
              <h1 className="font-heading text-lg font-medium tracking-tight">
                {mailbox === "eingang" ? "Eingang" : "Gesendet"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {filteredMessages.length === 0
                  ? "Keine Nachrichten"
                  : filteredMessages.length === 1
                    ? "1 Nachricht"
                    : `${filteredMessages.length} Nachrichten`}
              </p>
            </div>

            {/* Status-Tabs: Offen / Erledigt */}
            <div
              role="tablist"
              aria-label="Status"
              className="grid grid-cols-2 border border-border/70"
            >
              {INBOX_FILTERS.map((entry, index) => {
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

            {/* Sortierung + Filter-Toggle */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(
                  "size-9 shrink-0 rounded-none",
                  sortOpen && "bg-muted/60 text-foreground"
                )}
                aria-expanded={sortOpen}
                aria-label="Sortierung"
                title={
                  sortMode === "newest"
                    ? "Sortierung: Neueste"
                    : "Sortierung: Priorität"
                }
                onClick={() => setSortOpen((open) => !open)}
              >
                <ArrowUpDownIcon className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(
                  "size-9 shrink-0 rounded-none",
                  showPriorityFilters && "bg-muted/60 text-foreground",
                  (priorityFilter !== "alle" || unreadOnly) &&
                    "border-foreground/25 text-foreground"
                )}
                aria-expanded={showPriorityFilters}
                aria-label={
                  showPriorityFilters
                    ? "Prioritätsfilter ausblenden"
                    : "Nach Priorität filtern"
                }
                title={
                  showPriorityFilters
                    ? "Filter ausblenden"
                    : "Nach Priorität filtern"
                }
                onClick={() => {
                  if (showPriorityFilters) {
                    setPriorityFiltersOpen(false);
                    setPriorityFilter("alle");
                    setUnreadOnly(false);
                    return;
                  }
                  setPriorityFiltersOpen(true);
                }}
              >
                <ListFilterIcon className="size-4" />
              </Button>
            </div>

            {/* Sortier-Chips */}
            {sortOpen ? (
              <div
                role="tablist"
                aria-label="Sortierung"
                className="flex flex-wrap gap-1.5"
              >
                {SORT_OPTIONS.map((entry) => {
                  const active = sortMode === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSortMode(entry.id)}
                      className={cn(
                        "rounded-none border px-2 py-1 text-[0.7rem] font-medium transition-colors",
                        active
                          ? "border-foreground/25 bg-muted/60 text-foreground"
                          : "border-border/70 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                      )}
                    >
                      {entry.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {/* Prioritäts-Filter-Chips */}
            {showPriorityFilters ? (
              <div
                role="tablist"
                aria-label="Priorität"
                className="flex flex-wrap gap-1.5"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={unreadOnly}
                  onClick={() => {
                    setUnreadOnly((current) => !current);
                    setPriorityFiltersOpen(true);
                  }}
                  className={cn(
                    "rounded-none border px-2 py-1 text-[0.7rem] font-medium transition-colors",
                    unreadOnly
                      ? "border-sky-500/40 bg-sky-500/10 text-sky-950 dark:text-sky-100"
                      : "border-border/70 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                  )}
                >
                  Ungelesen
                </button>
                {PRIORITY_FILTERS.map((entry) => {
                  const active = priorityFilter === entry.id;
                  const count = priorityCounts[entry.id] ?? 0;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setPriorityFilter(entry.id);
                        setPriorityFiltersOpen(true);
                      }}
                      className={cn(
                        "rounded-none border px-2 py-1 text-[0.7rem] font-medium transition-colors",
                        active
                          ? cn(
                              "border-foreground/25 text-foreground",
                              entry.id === "sofort" &&
                                "border-rose-500/40 bg-rose-500/10 text-rose-950 dark:text-rose-100",
                              entry.id === "heute" &&
                                "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100",
                              entry.id === "diese_woche" &&
                                "border-sky-500/40 bg-sky-500/10 text-sky-950 dark:text-sky-100",
                              entry.id === "andere" &&
                                "border-violet-500/40 bg-violet-500/10 text-violet-950 dark:text-violet-100",
                              entry.id === "alle" && "bg-muted/60"
                            )
                          : "border-border/70 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                      )}
                    >
                      {entry.label}
                      {entry.id !== "alle" && count > 0 ? (
                        <span className="tabular-nums"> ({count})</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Nachrichten-Liste */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {messages.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground md:px-5">
                {mailbox === "eingang"
                  ? "Sobald dir jemand eine Nachricht schickt, erscheint sie hier."
                  : "Nachrichten, die du sendest, erscheinen hier."}
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
                    currentUserId={currentUserId}
                    selected={message.id === selectedId}
                    onSelect={() => selectMessage(message.id)}
                    onStatusSaved={handleStatusSaved}
                  />
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Detail-Bereich */}
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
              onStatusSaved={handleStatusSaved}
              onDeleted={() => handleDeleted(selected.id)}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
              <InboxIcon className="size-8 opacity-50" />
              <p className="text-sm">
                {messages.length === 0
                  ? "Keine Nachrichten."
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
  currentUserId,
  selected,
  onSelect,
  onStatusSaved,
}: {
  message: StaffMessageRecord;
  mailbox: InboxMailbox;
  currentUserId: string;
  selected: boolean;
  onSelect: () => void;
  onStatusSaved: (updated: StaffMessageRecord) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const unread = !message.readAt && message.recipientId === currentUserId;
  const isSender = mailbox === "gesendet";
  const canToggleDone =
    mailbox === "eingang" && message.recipientId === currentUserId;
  const isDone = message.status === "erledigt";

  function toggleDone(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!canToggleDone || isPending) {
      return;
    }
    const nextStatus: StaffMessageStatus = isDone ? "offen" : "erledigt";
    startTransition(async () => {
      const result = await setStaffMessageStatus(message.id, nextStatus);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      onStatusSaved(result.item);
      router.refresh();
    });
  }

  return (
    <li
      className={cn(
        "flex items-stretch transition-colors",
        isDone
          ? selected
            ? "bg-emerald-500/15"
            : "bg-emerald-500/[0.08] hover:bg-emerald-500/12"
          : selected
            ? "bg-muted/55"
            : "hover:bg-muted/30",
        unread && !isSender && !selected && !isDone
          ? "bg-sky-500/[0.04]"
          : null
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3 text-left md:px-5"
      >
        <div className="flex items-start gap-2">
          {!isSender && unread ? (
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
                  unread && !isSender
                    ? "font-semibold text-foreground"
                    : "font-medium text-foreground/90"
                )}
              >
                {isSender
                  ? `An ${message.recipientName}`
                  : message.senderName}
              </p>
              <span className="shrink-0 text-[0.7rem] tabular-nums text-muted-foreground">
                {formatListDate(message.createdAt)}
              </span>
            </div>
            <p
              className={cn(
                "truncate text-sm",
                unread && !isSender
                  ? "font-medium text-foreground"
                  : "text-foreground/80"
              )}
            >
              {message.topic}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {bodySnippet(message.body)}
            </p>
            {message.priority !== "keine" ||
            message.files.length > 0 ||
            isSender ? (
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
                {isSender ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-none px-1.5 py-0 text-[0.65rem]",
                      statusBadgeClass(message.status)
                    )}
                  >
                    {statusLabel(message.status)}
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

      {canToggleDone ? (
        <button
          type="button"
          onClick={toggleDone}
          disabled={isPending}
          className={cn(
            "group flex size-11 shrink-0 cursor-pointer items-center justify-center self-center mr-1 rounded-none",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50 md:mr-1.5 md:size-12"
          )}
          aria-pressed={isDone}
          aria-label={isDone ? "Als offen markieren" : "Als erledigt markieren"}
          title={isDone ? "Als offen markieren" : "Als erledigt markieren"}
        >
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full border-2 transition-colors duration-150",
              isDone
                ? "border-emerald-600 bg-emerald-500/15 text-emerald-700 group-hover:border-emerald-700 group-hover:bg-emerald-500/25 dark:text-emerald-400"
                : "border-muted-foreground/55 bg-transparent text-transparent group-hover:border-emerald-600 group-hover:bg-emerald-500/15"
            )}
            aria-hidden
          >
            {isDone ? (
              <CheckIcon className="size-3 stroke-[2.5] text-emerald-600 dark:text-emerald-400" />
            ) : null}
          </span>
        </button>
      ) : null}
    </li>
  );
}

function StaffMessageWorkPane({
  message,
  currentUserId,
  onBack,
  onStatusSaved,
  onDeleted,
}: {
  message: StaffMessageRecord;
  currentUserId: string;
  onBack: () => void;
  onStatusSaved: (updated: StaffMessageRecord) => void;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusValue, setStatusValue] = useState<StaffMessageStatus>(
    () => message.status
  );
  const [note, setNote] = useState("");
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const {
    listening,
    blocks,
    hasSession,
    sessionText,
    toggleListening,
    discardSession,
    stopListening,
  } = usePromptKitDictation();
  const canAcceptSession =
    Boolean(sessionText.trim()) ||
    blocks.some((block) => block.type === "section");
  const composedNote = hasSession
    ? mergeSessionIntoInput(note, blocks)
    : note;

  const isRecipient = message.recipientId === currentUserId;
  const statusChanged = statusValue !== message.status;

  // Auf Nachrichtenwechsel zurücksetzen
  useEffect(() => {
    setStatusValue(message.status);
    setNote("");
    discardSession();
  }, [message.id, message.status, discardSession]);

  // Textarea automatisch in der Höhe anpassen
  useLayoutEffect(() => {
    if (hasSession) {
      return;
    }
    const el = noteRef.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 56)}px`;
  }, [note, hasSession]);

  // Als gelesen markieren (nur Empfänger)
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

  function acceptDictation(sessionBlocks: DictationBlock[] = blocks) {
    if (!flattenBlocks(sessionBlocks).trim() && sessionBlocks.length === 0) {
      discardSession();
      return;
    }
    setNote((current) => mergeSessionIntoInput(current, sessionBlocks));
    discardSession();
  }

  function handleMicClick() {
    if (listening) {
      const finalized = stopListening();
      acceptDictation(finalized);
      return;
    }
    discardSession();
    toggleListening();
  }

  function handleSaveStatus() {
    if (listening) {
      toast.error("Bitte zuerst das Diktat beenden.");
      return;
    }
    startTransition(async () => {
      const result = await setStaffMessageStatus(
        message.id,
        statusValue,
        composedNote.trim() || undefined
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Status: ${statusLabel(statusValue)}`);
      setNote("");
      discardSession();
      onStatusSaved(result.item);
      router.refresh();
    });
  }

  function handleMarkDone() {
    startTransition(async () => {
      const result = await setStaffMessageStatus(message.id, "erledigt");
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setStatusValue("erledigt");
      toast.success("Als erledigt markiert.");
      onStatusSaved(result.item);
      router.refresh();
    });
  }

  function handleMarkOpen() {
    startTransition(async () => {
      const result = await setStaffMessageStatus(message.id, "offen");
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setStatusValue("offen");
      toast.success("Als offen markiert.");
      onStatusSaved(result.item);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteStaffMessage(message.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setDeleteOpen(false);
      toast.success("Nachricht gelöscht.");
      onDeleted();
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <h2 className="font-heading text-lg font-medium tracking-tight">
                  {message.topic}
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {isRecipient
                      ? `Von ${message.senderName}`
                      : `An ${message.recipientName}`}
                  </span>
                  {message.dueDate ? (
                    <span>
                      Fällig {formatStaffMessageDueDate(message.dueDate)}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {!message.readAt && isRecipient ? (
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
                  {/* Status-Badge: nur für Absender (read-only) */}
                  {!isRecipient ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-none",
                        statusBadgeClass(message.status)
                      )}
                    >
                      {statusLabel(message.status)}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="flex h-10 shrink-0 items-stretch">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isPending}
                  onClick={() => setDeleteOpen(true)}
                  className="size-10 shrink-0 rounded-none border-input shadow-none"
                  aria-label="Nachricht löschen"
                  title="Nachricht löschen"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nachrichteninhalt */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6">
        <div className="space-y-6">
          <ThreadBubble
            own={message.senderId === currentUserId}
            authorName={message.senderName}
            createdAt={message.createdAt}
            body={message.body}
            files={message.files}
          />

          {/* Kommentare (einfache gestapelte Liste, keine Chat-Blasen) */}
          {message.replies.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Kommentare
              </h3>
              <ul className="space-y-2">
                {message.replies.map((entry) => (
                  <li
                    key={entry.id}
                    className="space-y-1 border border-border/60 bg-background px-3.5 py-2.5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className="text-xs font-medium text-foreground">
                        {entry.authorName}
                      </p>
                      <p className="text-[0.65rem] tabular-nums text-muted-foreground">
                        {formatInboxDate(entry.createdAt)}
                      </p>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {entry.body.trim() || "—"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {/* Status-Panel: nur für Empfänger */}
      {isRecipient ? (
        <div className="shrink-0 space-y-3 border-t border-border/60 bg-background/90 px-4 py-4 md:px-6">
          <div className="flex flex-wrap items-stretch gap-2">
            <Select
              value={statusValue}
              disabled={isPending}
              onValueChange={(value) =>
                setStatusValue(value as StaffMessageStatus)
              }
            >
              <SelectTrigger
                id={`staff-status-${message.id}`}
                aria-label="Status wählen"
                className="min-w-[10rem] flex-1 rounded-none shadow-none sm:flex-none sm:min-w-[12rem]"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STAFF_MESSAGE_STATUSES.map((entry) => (
                  <SelectItem key={entry.value} value={entry.value}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {message.status !== "erledigt" ? (
              <Button
                type="button"
                disabled={isPending}
                onClick={handleMarkDone}
                className="h-9 flex-1 rounded-none sm:flex-none"
              >
                <CheckIcon data-icon="inline-start" />
                Als erledigt markieren
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={handleMarkOpen}
                className="h-9 flex-1 rounded-none sm:flex-none"
              >
                Als offen markieren
              </Button>
            )}
          </div>

          <div
            className={cn(
              "flex flex-col gap-2 rounded-none border border-border/70 bg-background px-3 py-2.5",
              hasSession && "border-foreground/30"
            )}
          >
            {hasSession ? (
              <CommentDictationPreview
                baseInput={note}
                blocks={blocks}
                listening={listening}
              />
            ) : (
              <textarea
                ref={noteRef}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                placeholder="Kommentar (optional)…"
                disabled={isPending}
                className="min-h-14 w-full resize-none overflow-hidden border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0 disabled:opacity-60"
                aria-label="Kommentar zum Status"
              />
            )}
            <div className="flex flex-wrap items-center gap-2">
              {hasSession ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => acceptDictation()}
                    disabled={!canAcceptSession}
                    className="h-8 rounded-none px-3"
                  >
                    <CheckIcon data-icon="inline-start" />
                    Übernehmen
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={discardSession}
                    className="h-8 rounded-none px-3"
                  >
                    <XIcon data-icon="inline-start" />
                    Verwerfen
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant={listening ? "default" : "outline"}
                onClick={handleMicClick}
                disabled={isPending}
                aria-pressed={listening}
                aria-label={listening ? "Stoppen" : "Kommentar diktieren"}
                title={listening ? "Stoppen" : "Kommentar diktieren"}
                className={cn(
                  "ml-auto h-8 rounded-none px-3",
                  listening && "animate-pulse"
                )}
              >
                {listening ? (
                  <MicOffIcon data-icon="inline-start" className="size-4" />
                ) : (
                  <MicIcon data-icon="inline-start" className="size-4" />
                )}
                {listening ? "Stoppen" : "Diktieren"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              disabled={
                isPending ||
                listening ||
                (!statusChanged && !composedNote.trim())
              }
              onClick={handleSaveStatus}
              className="rounded-none"
            >
              Speichern
            </Button>
          </div>
        </div>
      ) : null}

      {/* Löschen-Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">
              Nachricht löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              „{message.topic}" wird dauerhaft entfernt. Das lässt sich nicht
              rückgängig machen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CommentDictationPreview({
  baseInput,
  blocks,
  listening,
}: {
  baseInput: string;
  blocks: DictationBlock[];
  listening: boolean;
}) {
  const last = blocks[blocks.length - 1];
  const showListeningHint =
    listening &&
    (blocks.length === 0 ||
      last?.type === "section" ||
      (last?.type === "speech" && !speechDisplayText(last)));

  return (
    <div
      className="min-h-14 w-full whitespace-pre-wrap text-sm leading-relaxed"
      aria-live="polite"
      aria-label="Diktat prüfen"
    >
      {baseInput ? (
        <span className="text-foreground">{baseInput}</span>
      ) : null}
      {blocks.map((block, index) => {
        const prefix = blockJoinPrefix(baseInput, blocks, index);
        if (block.type === "section") {
          return (
            <span key={block.id}>
              {prefix}
              <span className="text-foreground">{block.text}</span>
            </span>
          );
        }
        const spoken = speechDisplayText(block);
        return (
          <span key={block.id}>
            {prefix}
            <span className="italic text-muted-foreground/80">{spoken}</span>
          </span>
        );
      })}
      {showListeningHint ? (
        <span className="italic text-muted-foreground/70">
          {baseInput || blocks.length ? "…" : "Jetzt sprechen…"}
        </span>
      ) : null}
    </div>
  );
}

function isPreviewableImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isPreviewablePdf(mimeType: string, filename: string): boolean {
  return (
    mimeType === "application/pdf" ||
    filename.toLowerCase().endsWith(".pdf")
  );
}

function staffMessageFileUrl(fileId: string, download = false): string {
  const base = `/api/staff-messages/files/${fileId}`;
  return download ? `${base}?download=1` : base;
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
  const [previewFile, setPreviewFile] = useState<
    StaffMessageRecord["files"][number] | null
  >(null);

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
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {body.trim() || "—"}
        </p>
        {files.length > 0 ? (
          <ul className="space-y-1.5 border-t border-border/50 pt-2">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-1.5"
              >
                <button
                  type="button"
                  onClick={() => setPreviewFile(file)}
                  className="min-w-0 flex-1 truncate text-left text-xs font-medium text-foreground/90 transition-colors hover:text-foreground hover:underline"
                >
                  <span className="inline-flex max-w-full items-center gap-1.5">
                    <PaperclipIcon className="size-3 shrink-0" />
                    <span className="truncate">{file.filename}</span>
                    <span className="shrink-0 font-normal text-muted-foreground">
                      ({formatFileSize(file.sizeBytes)})
                    </span>
                  </span>
                </button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-7 shrink-0 rounded-none"
                  asChild
                >
                  <a
                    href={staffMessageFileUrl(file.id, true)}
                    download={file.filename}
                    aria-label={`${file.filename} herunterladen`}
                    title="Herunterladen"
                  >
                    <DownloadIcon className="size-3.5" />
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Dialog
        open={previewFile != null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewFile(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className={cn(
            "fixed inset-0 top-0 left-0 z-50 flex h-dvh max-h-dvh w-screen max-w-none",
            "translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background p-0",
            "sm:max-w-none data-open:zoom-in-100 data-closed:zoom-out-100"
          )}
        >
          {previewFile ? (
            <>
              <div className="flex shrink-0 items-center gap-3 border-b border-border/60 px-4 py-3">
                <DialogTitle className="min-w-0 flex-1 truncate font-heading text-base font-medium">
                  {previewFile.filename}
                </DialogTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-none"
                  asChild
                >
                  <a
                    href={staffMessageFileUrl(previewFile.id, true)}
                    download={previewFile.filename}
                  >
                    <DownloadIcon data-icon="inline-start" />
                    Download
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0 rounded-none"
                  onClick={() => setPreviewFile(null)}
                  aria-label="Vorschau schließen"
                >
                  <XIcon className="size-5" />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto bg-muted/20">
                {isPreviewableImage(previewFile.mimeType) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed/redirect URL
                  <img
                    src={staffMessageFileUrl(previewFile.id)}
                    alt={previewFile.filename}
                    className="mx-auto max-h-full max-w-full object-contain p-4"
                  />
                ) : isPreviewablePdf(
                    previewFile.mimeType,
                    previewFile.filename
                  ) ? (
                  <iframe
                    title={previewFile.filename}
                    src={staffMessageFileUrl(previewFile.id)}
                    className="h-full min-h-[70dvh] w-full border-0 bg-background"
                  />
                ) : (
                  <div className="flex h-full min-h-[50dvh] flex-col items-center justify-center gap-4 px-6 text-center">
                    <PaperclipIcon className="size-10 text-muted-foreground" />
                    <p className="max-w-md text-sm text-muted-foreground">
                      Für diese Datei gibt es keine Vorschau. Du kannst sie
                      herunterladen.
                    </p>
                    <Button type="button" className="rounded-none" asChild>
                      <a
                        href={staffMessageFileUrl(previewFile.id, true)}
                        download={previewFile.filename}
                      >
                        <DownloadIcon data-icon="inline-start" />
                        Herunterladen
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
