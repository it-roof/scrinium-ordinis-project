"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckIcon,
  InboxIcon,
  ListFilterIcon,
  MicIcon,
  PaperclipIcon,
  RotateCcwIcon,
  SearchIcon,
  SendIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/v1/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/v1/ui/dropdown-menu";
import { Input } from "@/components/v1/ui/input";
import { Textarea } from "@/components/v1/ui/textarea";
import { useAudioWaveform } from "@/lib/dictation/use-audio-waveform";
import {
  mergeDictationIntoValue,
  useSimpleDictation,
} from "@/lib/dictation/use-simple-dictation";
import {
  closeStaffMessage,
  deleteStaffMessage,
  markStaffMessageRead,
  markStaffMessageUnread,
  reopenStaffMessage,
} from "@/lib/staff-messages/actions";
import {
  eventKindLabel,
  intentLabel,
  isStaffMessagePriority,
  priorityBadgeClass,
  priorityLabel,
  sortStaffMessagesByPriorityThenDate,
  STAFF_MESSAGE_COMPOSE_PRIORITIES,
  type StaffMessagePriority,
  type StaffMessageRecord,
} from "@/lib/staff-messages/types";
import { cn } from "@/lib/utils";

type Mailbox = "eingang" | "gesendet";
type StatusFilter = "offen" | "erledigt";
type PriorityFilter = StaffMessagePriority | "all";

function DictationWaveform({ active }: { active: boolean }) {
  const levels = useAudioWaveform(active, 24);

  return (
    <div
      className={cn(
        "flex h-9 w-32 shrink-0 items-center justify-end gap-[3px]",
        !active && "opacity-40"
      )}
      aria-hidden
    >
      {levels.map((level, index) => (
        <span
          key={index}
          className="w-[2.5px] rounded-full bg-muted-foreground/40 transition-[height,opacity] duration-100 ease-out"
          style={{
            height: `${Math.max(14, Math.round(level * 100))}%`,
            opacity: 0.35 + level * 0.45,
          }}
        />
      ))}
    </div>
  );
}

type Props = {
  mailbox: Mailbox;
  messages: StaffMessageRecord[];
  currentUserId: string;
  initialFilter?: "offen" | "erledigt" | null;
  initialPriority?: string | null;
  initialUnreadOnly?: boolean;
  initialMessageId?: string | null;
};

export function V1AufgabenView({
  mailbox,
  messages: initialMessages,
  currentUserId,
  initialFilter = null,
  initialPriority = null,
  initialUnreadOnly = false,
  initialMessageId = null,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [messages, setMessages] = useState(initialMessages);
  const [filter, setFilter] = useState<StatusFilter>(
    initialFilter === "erledigt" ? "erledigt" : "offen"
  );
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>(() =>
    initialPriority && isStaffMessagePriority(initialPriority)
      ? initialPriority
      : "all"
  );
  const [unreadOnly, setUnreadOnly] = useState(initialUnreadOnly);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialMessageId
  );
  const [mobileDetail, setMobileDetail] = useState(Boolean(initialMessageId));
  const [comment, setComment] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const skipAutoReadRef = useRef(false);
  const {
    listening: commentListening,
    liveText: commentDictationLive,
    hasSession: commentDictationOpen,
    startListening: startCommentDictation,
    stopListening: stopCommentDictation,
    discardSession: discardCommentDictation,
  } = useSimpleDictation();

  function acceptCommentDictation(dictated = stopCommentDictation()) {
    const trimmed = dictated.trim();
    if (!trimmed) {
      discardCommentDictation();
      return;
    }
    setComment((prev) => mergeDictationIntoValue(prev, trimmed));
    discardCommentDictation();
  }

  function handleCommentMicClick() {
    if (commentListening) {
      stopCommentDictation();
      return;
    }
    startCommentDictation();
  }

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const filtered = useMemo(() => {
    let list = messages.filter((m) =>
      filter === "offen" ? !m.closedAt : Boolean(m.closedAt)
    );
    if (priorityFilter !== "all") {
      list = list.filter((m) => m.priority === priorityFilter);
    }
    if (unreadOnly) {
      // Aktuell geöffnete Aufgabe behalten — sonst liest Auto-Read sie
      // und die Liste springt Aufgabe für Aufgabe durch.
      list = list.filter(
        (m) =>
          (!m.readAt && !m.closedAt) ||
          (m.id === selectedId && !m.closedAt)
      );
    }
    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((m) => {
        const haystack = [
          m.topic,
          m.body,
          m.createdByName,
          m.ballHolderName,
          m.matterTitle,
          m.matterClientName,
          intentLabel(m.intent),
          priorityLabel(m.priority),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }
    return [...list].sort(sortStaffMessagesByPriorityThenDate);
  }, [
    messages,
    filter,
    priorityFilter,
    unreadOnly,
    selectedId,
    search,
  ]);

  const activeFilterSummary = useMemo(() => {
    const parts: string[] = [
      filter === "offen" ? "Offen" : "Abgeschlossen",
    ];
    if (unreadOnly) parts.push("Ungelesen");
    if (priorityFilter !== "all") parts.push(priorityLabel(priorityFilter));
    return parts.join(" · ");
  }, [filter, unreadOnly, priorityFilter]);

  const hasCustomFilters =
    filter !== "offen" || unreadOnly || priorityFilter !== "all";

  function clearFilters() {
    setFilter("offen");
    setUnreadOnly(false);
    setPriorityFilter("all");
  }

  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!filtered.some((message) => message.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  const selected =
    filtered.find((m) => m.id === selectedId) ??
    messages.find((m) => m.id === selectedId) ??
    null;

  useEffect(() => {
    if (skipAutoReadRef.current) {
      skipAutoReadRef.current = false;
      return;
    }
    if (
      selected &&
      selected.ballHolderId === currentUserId &&
      !selected.readAt
    ) {
      void markStaffMessageRead(selected.id).then((res) => {
        if (res.success) {
          setMessages((prev) =>
            prev.map((m) => (m.id === res.message.id ? res.message : m))
          );
        }
      });
    }
  }, [selected?.id, selected?.readAt, selected?.ballHolderId, currentUserId]);

  useEffect(() => {
    if (!selected) return;
    setComment("");
    discardCommentDictation();
    setHistoryOpen(false);
  }, [selected?.id, discardCommentDictation]);

  const isBallHolder =
    selected && selected.ballHolderId === currentUserId && !selected.closedAt;
  const canReopen =
    selected &&
    selected.ballHolderId === currentUserId &&
    Boolean(selected.closedAt);

  function replaceMessage(next: StaffMessageRecord) {
    setMessages((prev) => prev.map((m) => (m.id === next.id ? next : m)));
  }

  function selectMessage(id: string) {
    setSelectedId(id);
    setMobileDetail(true);
  }

  function onClose() {
    if (!selected) return;
    if (!window.confirm("Aufgabe als abgeschlossen markieren?")) return;
    const formData = new FormData();
    formData.set("messageId", selected.id);
    formData.set("comment", comment);
    startTransition(async () => {
      const result = await closeStaffMessage(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Abgeschlossen.");
      replaceMessage(result.message);
      setFilter("erledigt");
      router.refresh();
    });
  }

  function onReopen() {
    if (!selected?.closedAt) return;
    startTransition(async () => {
      const result = await reopenStaffMessage(selected.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      replaceMessage(result.message);
      setFilter("offen");
      toast.success("Wieder geöffnet.");
      router.refresh();
    });
  }

  function onMarkUnread() {
    if (!selected?.readAt || selected.closedAt) return;
    if (selected.ballHolderId !== currentUserId) return;
    skipAutoReadRef.current = true;
    startTransition(async () => {
      const result = await markStaffMessageUnread(selected.id);
      if (!result.success) {
        skipAutoReadRef.current = false;
        toast.error(result.error);
        return;
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === result.message.id ? result.message : m))
      );
      toast.success("Als ungelesen markiert.");
      router.refresh();
    });
  }

  function onDelete() {
    if (!selected) return;
    if (!window.confirm("Aufgabe wirklich löschen?")) return;
    startTransition(async () => {
      const result = await deleteStaffMessage(selected.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== selected.id));
      setSelectedId(null);
      setMobileDetail(false);
      toast.success("Gelöscht.");
      router.refresh();
    });
  }

  const openCount = messages.filter((m) => !m.closedAt).length;

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      {/* Liste */}
      <aside
        className={cn(
          "flex min-h-0 w-full flex-col border-border/40 lg:w-[26rem] lg:shrink-0 lg:border-r",
          mobileDetail ? "hidden lg:flex" : "flex"
        )}
      >
        <div className="flex shrink-0 flex-col gap-2.5 border-b border-border/40 px-4 py-3">
          <h2 className="font-heading text-base font-medium tracking-tight">
            Meine Aufgaben
          </h2>

          <div
            role="tablist"
            aria-label="Aufgabenansicht"
            className="grid grid-cols-2 gap-0.5 rounded-lg border border-border/60 bg-muted/40 p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mailbox === "eingang"}
              onClick={() => router.push("/v1/eingang")}
              className={cn(
                "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground transition-all hover:text-foreground",
                mailbox === "eingang" &&
                  "bg-primary font-medium text-primary-foreground shadow-none hover:bg-primary hover:text-primary-foreground"
              )}
            >
              <InboxIcon className="size-3.5 shrink-0" aria-hidden />
              Eingang
              {mailbox === "eingang" && openCount > 0 ? (
                <span className="tabular-nums opacity-80">{openCount}</span>
              ) : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mailbox === "gesendet"}
              onClick={() => router.push("/v1/gesendet")}
              className={cn(
                "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground transition-all hover:text-foreground",
                mailbox === "gesendet" &&
                  "bg-primary font-medium text-primary-foreground shadow-none hover:bg-primary hover:text-primary-foreground"
              )}
            >
              <SendIcon className="size-3.5 shrink-0" aria-hidden />
              Gesendet
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suchen…"
                className="h-8 rounded-lg bg-background pl-8 text-sm"
                aria-label="Aufgaben durchsuchen"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 rounded-lg px-2.5"
                  aria-label="Filter"
                >
                  <ListFilterIcon className="size-3.5 shrink-0" aria-hidden />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={filter}
                  onValueChange={(value) => {
                    if (value === "offen" || value === "erledigt") {
                      setFilter(value);
                      if (value === "erledigt") {
                        setUnreadOnly(false);
                      }
                    }
                  }}
                >
                  <DropdownMenuRadioItem value="offen">
                    Offen
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="erledigt">
                    Abgeschlossen
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Priorität</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={priorityFilter}
                  onValueChange={(value) => {
                    if (value === "all" || isStaffMessagePriority(value)) {
                      setPriorityFilter(value);
                    }
                  }}
                >
                  <DropdownMenuRadioItem value="all">
                    Alle
                  </DropdownMenuRadioItem>
                  {STAFF_MESSAGE_COMPOSE_PRIORITIES.map((entry) => (
                    <DropdownMenuRadioItem
                      key={entry.value}
                      value={entry.value}
                    >
                      {entry.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {hasCustomFilters ? (
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-xs text-muted-foreground">
                {activeFilterSummary}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-3" aria-hidden />
                Filter aufheben
              </button>
            </div>
          ) : null}
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {filtered.length === 0 ? (
            <li className="flex flex-col gap-3 px-5 py-10">
              <p className="text-sm text-muted-foreground">
                {search.trim()
                  ? "Keine Treffer."
                  : unreadOnly
                    ? "Keine ungelesenen Aufgaben."
                    : priorityFilter !== "all"
                      ? `Keine Aufgaben mit Priorität „${priorityLabel(priorityFilter)}“.`
                      : filter === "offen"
                        ? "Keine offenen Aufgaben."
                        : "Keine abgeschlossenen Aufgaben."}
              </p>
              {mailbox === "eingang" &&
              filter === "offen" &&
              !search.trim() ? (
                <Button asChild variant="outline" size="sm" className="w-fit">
                  <Link href="/v1/zuweisen">Aufgabe zuweisen</Link>
                </Button>
              ) : null}
            </li>
          ) : (
            filtered.map((message) => {
              const unread = !message.readAt && !message.closedAt;
              const person =
                mailbox === "eingang"
                  ? `von ${message.createdByName}`
                  : `bei ${message.ballHolderName}`;
              const matterLabel = [
                message.matterClientName,
                message.matterTitle,
              ]
                .filter(Boolean)
                .join(" — ");
              const when = formatListDate(message.createdAt);
              const meta = [intentLabel(message.intent), person].join(" · ");

              return (
                <li key={message.id} className="border-b border-border/25">
                  <button
                    type="button"
                    onClick={() => selectMessage(message.id)}
                    className={cn(
                      "flex w-full gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                      selectedId === message.id && "bg-muted/50"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-[0.45rem] size-1.5 shrink-0 rounded-full",
                        unread ? "bg-sky-600" : "bg-transparent"
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm font-medium leading-snug">
                          {message.topic}
                        </span>
                        <span className="shrink-0 text-[0.6875rem] tabular-nums text-muted-foreground">
                          {when}
                        </span>
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          className={cn(
                            "inline-flex shrink-0 rounded-md border px-1.5 py-px text-[0.6875rem] leading-4",
                            priorityBadgeClass(message.priority)
                          )}
                        >
                          {priorityLabel(message.priority)}
                        </span>
                        <span className="truncate">{meta}</span>
                      </span>
                      {matterLabel ? (
                        <span className="block truncate text-xs text-muted-foreground/80">
                          {matterLabel}
                        </span>
                      ) : null}
                      {message.body.trim() ? (
                        <span className="block truncate text-xs text-muted-foreground/70">
                          {message.body.trim()}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      {/* Detail */}
      <section
        className={cn(
          "min-h-0 min-w-0 flex-1 flex-col",
          mobileDetail ? "flex" : "hidden lg:flex"
        )}
      >
        {!selected ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <p className="text-sm text-muted-foreground">
              Links eine Aufgabe wählen.
            </p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 lg:px-10 lg:py-8">
              <button
                type="button"
                onClick={() => setMobileDetail(false)}
                className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:hidden"
              >
                <ArrowLeftIcon className="size-3.5" aria-hidden />
                Zurück zur Liste
              </button>

              <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
                <header className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-heading text-2xl font-medium leading-snug tracking-tight">
                      {selected.topic}
                    </h2>
                    <span
                      className={cn(
                        "mt-1 shrink-0 rounded-lg border px-2 py-0.5 text-xs leading-5",
                        priorityBadgeClass(selected.priority)
                      )}
                    >
                      {priorityLabel(selected.priority)}
                    </span>
                  </div>

                  <dl className="grid gap-2 text-sm">
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-muted-foreground">
                        Vorgehen
                      </dt>
                      <dd>
                        {selected.closedAt
                          ? "Abgeschlossen"
                          : selected.ballHolderId === currentUserId
                            ? intentLabel(selected.intent)
                            : `Bei ${selected.ballHolderName} · ${intentLabel(selected.intent)}`}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-muted-foreground">
                        Von
                      </dt>
                      <dd>{selected.createdByName}</dd>
                    </div>
                    {selected.matterTitle ? (
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 text-muted-foreground">
                          Akte
                        </dt>
                        <dd className="min-w-0">
                          {selected.matterClientName
                            ? `${selected.matterClientName} — `
                            : ""}
                          {selected.matterTitle}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </header>

                {selected.body ? (
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Bemerkung
                    </h3>
                    <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed">
                      {selected.body}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Keine Bemerkung.
                  </p>
                )}

                {selected.files.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Dokumente
                    </h3>
                    <ul className="flex flex-wrap gap-2">
                      {selected.files.map((file) => (
                        <li key={file.id}>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-9 max-w-full gap-2 rounded-lg border-border/80 bg-background px-3 shadow-none"
                          >
                            <a
                              href={`/api/staff-messages/files/${file.id}?download=1`}
                              title={file.filename}
                            >
                              <PaperclipIcon
                                className="size-3.5 shrink-0 text-muted-foreground"
                                aria-hidden
                              />
                              <span className="min-w-0 truncate">
                                {file.filename}
                              </span>
                            </a>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="border-t border-border/40 pt-4">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen((open) => !open)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {historyOpen ? "Verlauf ausblenden" : "Verlauf anzeigen"}
                  </button>
                  {historyOpen ? (
                    <ul className="mt-4 space-y-3">
                      {selected.events.map((event) => (
                        <li key={event.id} className="text-sm">
                          <p className="font-medium">
                            {eventKindLabel(event.kind)}
                            {event.intent
                              ? ` · ${intentLabel(event.intent)}`
                              : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {event.actorName}
                            {event.toBallHolderName
                              ? ` → ${event.toBallHolderName}`
                              : ""}
                            {" · "}
                            {new Date(event.createdAt).toLocaleString("de-DE")}
                          </p>
                          {event.comment ? (
                            <p className="mt-1 text-muted-foreground">
                              {event.comment}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-border/40 bg-background/95 px-5 py-4 backdrop-blur-sm lg:px-10">
              <div className="mx-auto w-full max-w-2xl space-y-3">
                {isBallHolder ? (
                  <>
                    <div
                      className={cn(
                        "flex flex-col gap-2 rounded-lg border border-border/80 bg-background px-3 pt-3 pb-2.5",
                        commentDictationOpen && "border-foreground/25"
                      )}
                    >
                      {commentDictationOpen ? (
                        <div className="max-h-40 min-h-16 overflow-y-auto px-0.5 py-1 text-sm leading-relaxed">
                          <p className="whitespace-pre-wrap">
                            {comment.trim() ? (
                              <span className="text-foreground not-italic">
                                {comment}
                                {/\s$/.test(comment) ? "" : " "}
                              </span>
                            ) : null}
                            <span className="text-muted-foreground italic">
                              {commentDictationLive ||
                                (commentListening
                                  ? "Hört zu…"
                                  : "Diktat bereit zum Übernehmen")}
                            </span>
                          </p>
                        </div>
                      ) : (
                        <Textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Kommentar (optional) — tippen oder diktieren…"
                          className={cn(
                            "max-h-40 min-h-16 w-full resize-none overflow-y-auto border-0 bg-transparent px-0.5 py-1",
                            "text-sm leading-relaxed shadow-none",
                            "placeholder:text-muted-foreground/55 focus-visible:border-0 focus-visible:ring-0"
                          )}
                          aria-label="Kommentar"
                        />
                      )}
                      <div className="flex items-center justify-end gap-1.5">
                        {commentDictationOpen ? (
                          <>
                            <DictationWaveform active={commentListening} />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={discardCommentDictation}
                              aria-label="Verwerfen"
                              title="Verwerfen"
                              className="ml-2 size-9 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <XIcon className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => acceptCommentDictation()}
                              disabled={!commentDictationLive.trim()}
                              aria-label="Übernehmen"
                              title="Übernehmen"
                              className="size-9 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <CheckIcon className="size-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleCommentMicClick}
                            aria-pressed={commentListening}
                            aria-label="Kommentar diktieren"
                            title="Kommentar diktieren"
                            className="size-9 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <MicIcon className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      disabled={pending}
                      onClick={onClose}
                      className="h-10 w-full gap-1.5 rounded-lg"
                    >
                      <CheckIcon className="size-3.5" aria-hidden />
                      Fertig
                    </Button>
                  </>
                ) : null}

                {canReopen ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={onReopen}
                    className="h-10 w-full gap-1.5 rounded-lg"
                  >
                    <RotateCcwIcon className="size-3.5" aria-hidden />
                    Wieder öffnen
                  </Button>
                ) : null}

                <div className="flex items-center gap-4">
                  {mailbox === "eingang" &&
                  selected.ballHolderId === currentUserId &&
                  selected.readAt &&
                  !selected.closedAt ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={onMarkUnread}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Als ungelesen
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={onDelete}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function formatListDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThatDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const dayDiff = Math.round(
    (startToday.getTime() - startThatDay.getTime()) / 86_400_000
  );

  if (dayDiff === 0) {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (dayDiff === 1) return "Gestern";
  if (dayDiff < 7) {
    return date.toLocaleDateString("de-DE", { weekday: "short" });
  }
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}
