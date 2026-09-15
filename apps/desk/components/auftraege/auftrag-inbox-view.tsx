"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, ForwardIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  closeStaffMessage,
  deleteStaffMessage,
  getStaffColleaguesAction,
  handoffStaffMessage,
  markStaffMessageRead,
} from "@/lib/staff-messages/actions";
import {
  eventKindLabel,
  formatFileSize,
  intentLabel,
  priorityBadgeClass,
  priorityLabel,
  sortStaffMessagesByPriorityThenDate,
  STAFF_MESSAGE_INTENTS,
  type StaffMessageColleague,
  type StaffMessageIntent,
  type StaffMessageRecord,
} from "@/lib/staff-messages/types";
import { functionHref } from "@/lib/area/paths";
import type { AppModuleId } from "@/lib/modules";
import { cn } from "@/lib/utils";

type Mailbox = "eingang" | "gesendet";

type Props = {
  area: AppModuleId;
  mailbox: Mailbox;
  messages: StaffMessageRecord[];
  currentUserId: string;
  initialFilter?: "offen" | "erledigt" | null;
  initialPriority?: string | null;
  initialUnreadOnly?: boolean;
  initialMessageId?: string | null;
};

export function AuftragInboxView({
  area,
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
  const [filter, setFilter] = useState<"offen" | "erledigt">(
    initialFilter === "erledigt" ? "erledigt" : "offen"
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initialMessageId
  );
  const [colleagues, setColleagues] = useState<StaffMessageColleague[]>([]);
  const [handoffTo, setHandoffTo] = useState("");
  const [handoffIntent, setHandoffIntent] =
    useState<StaffMessageIntent>("erledigen");
  const [handoffComment, setHandoffComment] = useState("");
  const [closeComment, setCloseComment] = useState("");
  const [actionMode, setActionMode] = useState<"fertig" | "weitergeben">(
    "fertig"
  );
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    void getStaffColleaguesAction().then((res) => {
      if (res.success) setColleagues(res.items);
    });
  }, []);

  const filtered = useMemo(() => {
    let list = messages.filter((m) =>
      filter === "offen" ? !m.closedAt : Boolean(m.closedAt)
    );
    if (initialPriority) {
      list = list.filter((m) => m.priority === initialPriority);
    }
    if (initialUnreadOnly) {
      list = list.filter((m) => !m.readAt && !m.closedAt);
    }
    return [...list].sort(sortStaffMessagesByPriorityThenDate);
  }, [messages, filter, initialPriority, initialUnreadOnly]);

  const selected =
    filtered.find((m) => m.id === selectedId) ??
    messages.find((m) => m.id === selectedId) ??
    null;

  useEffect(() => {
    if (selected && selected.ballHolderId === currentUserId && !selected.readAt) {
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
    const defaultTo =
      selected.previousBallHolderId &&
      selected.previousBallHolderId !== currentUserId
        ? selected.previousBallHolderId
        : selected.createdById !== currentUserId
          ? selected.createdById
          : "";
    setHandoffTo(defaultTo);
    setHandoffIntent("erledigen");
    setHandoffComment("");
    setCloseComment("");
    setActionMode("fertig");
    setHistoryOpen(false);
  }, [selected?.id]);

  const isBallHolder =
    selected && selected.ballHolderId === currentUserId && !selected.closedAt;

  function replaceMessage(next: StaffMessageRecord) {
    setMessages((prev) => prev.map((m) => (m.id === next.id ? next : m)));
  }

  function onClose() {
    if (!selected) return;
    if (!window.confirm("Aufgabe wirklich als fertig markieren?")) return;
    const formData = new FormData();
    formData.set("messageId", selected.id);
    formData.set("comment", closeComment);
    startTransition(async () => {
      const result = await closeStaffMessage(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Fertig.");
      replaceMessage(result.message);
      setFilter("erledigt");
      router.refresh();
    });
  }

  function onHandoff() {
    if (!selected || !handoffTo) {
      toast.error("Bitte einen Mitarbeiter wählen.");
      return;
    }
    const formData = new FormData();
    formData.set("messageId", selected.id);
    formData.set("toBallHolderId", handoffTo);
    formData.set("intent", handoffIntent);
    formData.set("comment", handoffComment);
    startTransition(async () => {
      const result = await handoffStaffMessage(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Weitergegeben.");
      setMessages((prev) => prev.filter((m) => m.id !== result.message.id));
      setSelectedId(null);
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
      toast.success("Gelöscht.");
      router.refresh();
    });
  }

  return (
    <div className="flex h-[calc(100dvh-var(--header-height)-5.5rem)] min-h-0 flex-col overflow-hidden lg:flex-row md:h-[calc(100dvh-var(--header-height)-6.5rem)]">
      <aside className="flex min-h-0 w-full flex-1 flex-col border-b border-border/60 lg:w-[26rem] lg:flex-none lg:shrink-0 lg:border-r lg:border-b-0">
        <header className="shrink-0 space-y-2 px-1 pt-1 pb-2 lg:pr-6">
          <div className="space-y-0.5">
            <h1 className="font-heading text-xl font-medium tracking-tight">
              Meine Aufgaben
            </h1>
            <p className="text-xs text-muted-foreground">
              {mailbox === "eingang"
                ? "Aufgaben, bei denen du den Ball hast."
                : "Aufgaben, die du angestoßen oder weitergegeben hast."}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Aufgabenansicht"
            className="grid grid-cols-2 gap-0.5 rounded-lg bg-muted/80 p-0.5 ring-1 ring-border/60"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mailbox === "eingang"}
              onClick={() => router.push(functionHref(area, "inbox"))}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sm transition-all",
                mailbox === "eingang"
                  ? "bg-background font-medium text-foreground shadow-sm ring-1 ring-border/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Bei mir
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mailbox === "gesendet"}
              onClick={() => router.push(functionHref(area, "inbox-sent"))}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sm transition-all",
                mailbox === "gesendet"
                  ? "bg-background font-medium text-foreground shadow-sm ring-1 ring-border/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Gesendet
            </button>
          </div>
        </header>

        <div className="flex shrink-0 gap-1.5 px-1 pb-2 lg:pr-6">
          <button
            type="button"
            onClick={() => setFilter("offen")}
            className={cn(
              "flex-1 rounded-none border px-2.5 py-1.5 text-sm",
              filter === "offen"
                ? "border-foreground bg-muted font-medium"
                : "border-border"
            )}
          >
            Offen
          </button>
          <button
            type="button"
            onClick={() => setFilter("erledigt")}
            className={cn(
              "flex-1 rounded-none border px-2.5 py-1.5 text-sm",
              filter === "erledigt"
                ? "border-foreground bg-muted font-medium"
                : "border-border"
            )}
          >
            Fertig
          </button>
        </div>

        <ul className="min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto overscroll-contain">
          {filtered.length === 0 ? (
            <li className="px-1 py-8 text-sm text-muted-foreground">
              Keine Aufgaben.
            </li>
          ) : (
            filtered.map((message) => (
              <li key={message.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(message.id)}
                  className={cn(
                    "w-full px-1 py-3 text-left transition-colors hover:bg-muted/40 lg:pr-6",
                    selectedId === message.id && "bg-muted/60"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{message.topic}</span>
                    {!message.readAt && !message.closedAt ? (
                      <span className="shrink-0 text-xs text-sky-700">neu</span>
                    ) : null}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    <span
                      className={cn(
                        "inline-flex border px-1.5 py-0 text-xs",
                        priorityBadgeClass(message.priority)
                      )}
                    >
                      {priorityLabel(message.priority)}
                    </span>
                    <span>
                      {mailbox === "eingang"
                        ? `von ${message.createdByName}`
                        : `bei ${message.ballHolderName}`}
                    </span>
                    {message.matterTitle ? (
                      <span className="truncate">
                        · {message.matterClientName || message.matterTitle}
                      </span>
                    ) : null}
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain lg:pl-8">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <p className="text-muted-foreground">
              Links eine Aufgabe wählen.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 py-4">
            <header className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-heading text-3xl font-medium leading-snug">
                  {selected.topic}
                </h2>
                <span
                  className={cn(
                    "mt-1.5 shrink-0 inline-flex border px-2 py-0.5 text-xs",
                    priorityBadgeClass(selected.priority)
                  )}
                >
                  {priorityLabel(selected.priority)}
                </span>
              </div>
              <div className="space-y-1 text-base text-muted-foreground">
                <p>Von {selected.createdByName}</p>
                {selected.matterTitle ? (
                  <p>
                    Akte / Mandant:{" "}
                    {selected.matterClientName
                      ? `${selected.matterClientName} — `
                      : ""}
                    {selected.matterTitle}
                  </p>
                ) : null}
              </div>
            </header>

            <div className="space-y-3">
              <p className="text-base">
                {selected.closedAt ? (
                  <span className="text-muted-foreground">Fertig</span>
                ) : selected.ballHolderId === currentUserId ? (
                  <span className="font-medium text-emerald-800">
                    Du bist dran — {intentLabel(selected.intent)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Wartet auf {selected.ballHolderName} (
                    {intentLabel(selected.intent)})
                  </span>
                )}
              </p>
              {selected.body ? (
                <p className="whitespace-pre-wrap text-base leading-relaxed">
                  {selected.body}
                </p>
              ) : null}
            </div>

            {selected.files.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-base font-medium">Anhänge</h3>
                <ul className="space-y-2">
                  {selected.files.map((file) => (
                    <li key={file.id}>
                      <a
                        href={`/api/staff-messages/files/${file.id}?download=1`}
                        className="text-base underline underline-offset-2"
                      >
                        {file.filename} ({formatFileSize(file.sizeBytes)})
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setHistoryOpen((open) => !open)}
                className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                {historyOpen ? "Verlauf ausblenden" : "Verlauf anzeigen"}
              </button>
              {historyOpen ? (
                <ul className="space-y-3 border-l-2 border-border pl-4">
                  {selected.events.map((event) => (
                    <li key={event.id} className="text-sm">
                      <div className="font-medium">
                        {eventKindLabel(event.kind)}
                        {event.intent ? ` · ${intentLabel(event.intent)}` : ""}
                      </div>
                      <div className="text-muted-foreground">
                        {event.actorName}
                        {event.toBallHolderName
                          ? ` → ${event.toBallHolderName}`
                          : ""}
                        {" · "}
                        {new Date(event.createdAt).toLocaleString("de-DE")}
                      </div>
                      {event.comment ? (
                        <div className="mt-1">{event.comment}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {isBallHolder ? (
              <div className="mt-auto space-y-4 border-t pt-6">
                <div
                  role="tablist"
                  aria-label="Aktion"
                  className="grid grid-cols-2 gap-1 rounded-xl bg-muted/80 p-1 ring-1 ring-border/60"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={actionMode === "fertig"}
                    onClick={() => setActionMode("fertig")}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-base transition-all",
                      actionMode === "fertig"
                        ? "bg-background font-medium text-foreground shadow-sm ring-1 ring-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <CheckIcon className="size-4 opacity-70" aria-hidden />
                    Fertig
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={actionMode === "weitergeben"}
                    onClick={() => setActionMode("weitergeben")}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-base transition-all",
                      actionMode === "weitergeben"
                        ? "bg-background font-medium text-foreground shadow-sm ring-1 ring-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <ForwardIcon className="size-4 opacity-70" aria-hidden />
                    Weitergeben
                  </button>
                </div>

                {actionMode === "fertig" ? (
                  <div className="space-y-3">
                    <Textarea
                      value={closeComment}
                      onChange={(e) => setCloseComment(e.target.value)}
                      placeholder="Optionaler Kommentar…"
                      className="min-h-24 rounded-none text-base"
                    />
                    <Button
                      type="button"
                      disabled={pending}
                      onClick={onClose}
                      className="h-12 w-full rounded-none text-base"
                    >
                      Fertig melden
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select
                      value={handoffTo}
                      onChange={(e) => setHandoffTo(e.target.value)}
                      className="h-12 w-full rounded-none border border-border bg-background px-3 text-base"
                    >
                      <option value="">Mitarbeiter wählen…</option>
                      {colleagues.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {selected.previousBallHolderId === c.id
                            ? " (zurück)"
                            : ""}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-2">
                      {STAFF_MESSAGE_INTENTS.map((entry) => (
                        <button
                          key={entry.value}
                          type="button"
                          onClick={() => setHandoffIntent(entry.value)}
                          className={cn(
                            "rounded-none border px-3 py-2 text-sm",
                            handoffIntent === entry.value
                              ? "border-foreground bg-muted font-medium"
                              : "border-border hover:bg-muted/40"
                          )}
                        >
                          {entry.label}
                        </button>
                      ))}
                    </div>
                    <Textarea
                      value={handoffComment}
                      onChange={(e) => setHandoffComment(e.target.value)}
                      placeholder="Optionaler Kommentar…"
                      className="min-h-24 rounded-none text-base"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      onClick={onHandoff}
                      className="h-12 w-full rounded-none text-base"
                    >
                      Weitergeben
                    </Button>
                  </div>
                )}
              </div>
            ) : null}

            <div className="pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={onDelete}
                className="px-0 text-muted-foreground hover:bg-transparent hover:text-destructive"
              >
                Löschen
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
