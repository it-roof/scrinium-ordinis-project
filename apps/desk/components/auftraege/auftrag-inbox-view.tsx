"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  HANDOFF_PRESETS,
  intentLabel,
  priorityBadgeClass,
  priorityLabel,
  sortStaffMessagesByPriorityThenDate,
  STAFF_MESSAGE_INTENTS,
  type StaffMessageColleague,
  type StaffMessageIntent,
  type StaffMessageRecord,
} from "@/lib/staff-messages/types";
import { cn } from "@/lib/utils";

type Mailbox = "eingang" | "gesendet";

type Props = {
  mailbox: Mailbox;
  messages: StaffMessageRecord[];
  currentUserId: string;
  initialFilter?: "offen" | "erledigt" | null;
  initialPriority?: string | null;
  initialUnreadOnly?: boolean;
  initialMessageId?: string | null;
};

export function AuftragInboxView({
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
  }, [selected?.id]);

  const isBallHolder =
    selected && selected.ballHolderId === currentUserId && !selected.closedAt;

  function replaceMessage(next: StaffMessageRecord) {
    setMessages((prev) => prev.map((m) => (m.id === next.id ? next : m)));
  }

  function onClose() {
    if (!selected) return;
    if (!window.confirm("Auftrag wirklich als fertig markieren?")) return;
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
    if (!window.confirm("Auftrag wirklich löschen?")) return;
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
    <div className="flex min-h-[70vh] flex-col gap-4 px-4 py-6 lg:flex-row">
      <div className="w-full shrink-0 space-y-4 lg:w-96">
        <header className="space-y-1">
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            {mailbox === "eingang" ? "Eingang" : "Gesendet"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mailbox === "eingang"
              ? "Aufträge, bei denen du den Ball hast."
              : "Aufträge, die du angestoßen oder weitergegeben hast."}
          </p>
        </header>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("offen")}
            className={cn(
              "flex-1 rounded-none border px-3 py-3 text-base",
              filter === "offen"
                ? "border-foreground bg-muted"
                : "border-border"
            )}
          >
            Offen
          </button>
          <button
            type="button"
            onClick={() => setFilter("erledigt")}
            className={cn(
              "flex-1 rounded-none border px-3 py-3 text-base",
              filter === "erledigt"
                ? "border-foreground bg-muted"
                : "border-border"
            )}
          >
            Fertig
          </button>
        </div>

        <ul className="divide-y border border-border">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-sm text-muted-foreground">
              Keine Aufträge.
            </li>
          ) : (
            filtered.map((message) => (
              <li key={message.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(message.id)}
                  className={cn(
                    "w-full px-4 py-4 text-left hover:bg-muted/40",
                    selectedId === message.id && "bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{message.topic}</span>
                    {!message.readAt && !message.closedAt ? (
                      <span className="text-xs text-sky-700">neu</span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    <span>{intentLabel(message.intent)}</span>
                    <span aria-hidden>·</span>
                    <span>
                      {mailbox === "eingang"
                        ? `von ${message.createdByName}`
                        : `bei ${message.ballHolderName}`}
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
                    {message.matterTitle ? (
                      <>
                        <span aria-hidden>·</span>
                        <span>
                          Akte:{" "}
                          {message.matterClientName
                            ? `${message.matterClientName} — `
                            : ""}
                          {message.matterTitle}
                        </span>
                      </>
                    ) : null}
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="min-w-0 flex-1 border border-border bg-card p-6">
        {!selected ? (
          <p className="text-muted-foreground">
            Links einen Auftrag wählen.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="font-heading text-2xl font-medium">
                {selected.topic}
              </h2>
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
              <p className="text-sm text-muted-foreground">
                Von {selected.createdByName}
                {selected.dueDate ? ` · bis ${selected.dueDate}` : ""}
              </p>
              <p>
                <span
                  className={cn(
                    "inline-flex border px-2 py-0.5 text-sm",
                    priorityBadgeClass(selected.priority)
                  )}
                >
                  {priorityLabel(selected.priority)}
                </span>
              </p>
              {selected.matterTitle ? (
                <p className="text-base">
                  Akte:{" "}
                  <strong>
                    {selected.matterClientName
                      ? `${selected.matterClientName} — `
                      : ""}
                    {selected.matterTitle}
                  </strong>
                </p>
              ) : null}
            </div>

            {selected.body ? (
              <p className="whitespace-pre-wrap text-base leading-relaxed">
                {selected.body}
              </p>
            ) : null}

            {selected.files.length > 0 ? (
              <div className="space-y-2">
                <h3 className="font-medium">Anhänge</h3>
                <ul className="space-y-1">
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

            <div className="space-y-2">
              <h3 className="font-medium">Verlauf</h3>
              <ul className="space-y-2 border-l-2 border-border pl-4">
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
            </div>

            {isBallHolder ? (
              <div className="space-y-6 border-t pt-6">
                <section className="space-y-3">
                  <h3 className="text-lg font-medium">Fertig melden</h3>
                  <Textarea
                    value={closeComment}
                    onChange={(e) => setCloseComment(e.target.value)}
                    placeholder="Optionaler Kommentar…"
                    className="rounded-none text-base"
                  />
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={onClose}
                    className="h-12 w-full rounded-none text-base"
                  >
                    Fertig
                  </Button>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-medium">Weitergeben</h3>
                  <div className="flex flex-wrap gap-2">
                    {HANDOFF_PRESETS.map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => {
                          setHandoffIntent(preset.intent);
                          setHandoffComment(preset.comment);
                        }}
                        className="rounded-none border border-border px-3 py-2 text-sm hover:bg-muted/40"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {STAFF_MESSAGE_INTENTS.map((entry) => (
                      <button
                        key={entry.value}
                        type="button"
                        onClick={() => setHandoffIntent(entry.value)}
                        className={cn(
                          "rounded-none border px-3 py-3 text-left text-sm",
                          handoffIntent === entry.value
                            ? "border-foreground bg-muted"
                            : "border-border"
                        )}
                      >
                        {entry.label}
                      </button>
                    ))}
                  </div>
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
                  <Textarea
                    value={handoffComment}
                    onChange={(e) => setHandoffComment(e.target.value)}
                    placeholder="Kurzer Kommentar zur Übergabe…"
                    className="rounded-none text-base"
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
                </section>
              </div>
            ) : null}

            <div className="border-t pt-4">
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={onDelete}
                className="rounded-none"
              >
                Löschen
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
