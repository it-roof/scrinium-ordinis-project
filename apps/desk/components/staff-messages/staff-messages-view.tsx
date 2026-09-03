"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  HomeIcon,
  MicIcon,
  MicOffIcon,
  PaperclipIcon,
  PlusIcon,
  SendIcon,
  SquarePenIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { areaBasePath } from "@/lib/area/paths";
import type { ContentModule } from "@/lib/db/schema";
import type { AppModuleId } from "@/lib/modules";
import {
  blockJoinPrefix,
  flattenBlocks,
  mergeSessionIntoInput,
  speechDisplayText,
  type DictationBlock,
} from "@/lib/prompt-kit/dictation";
import { usePromptKitDictation } from "@/lib/prompt-kit/use-dictation";
import {
  createStaffMessage,
} from "@/lib/staff-messages/actions";
import {
  getRecipientUsageCounts,
  groupColleaguesByPhonebookColumns,
  recordRecipientUse,
  splitColleaguesByUsage,
} from "@/lib/staff-messages/recipient-usage";
import {
  formatFileSize,
  germanDateToIso,
  isoToGermanDate,
  maskGermanDateInput,
  dueDateForStaffMessagePriority,
  priorityLabel,
  STAFF_MESSAGE_PRIORITIES,
  STAFF_MESSAGE_TOPIC_PRESETS,
  validateStaffMessageFile,
  type StaffMessageColleague,
  type StaffMessageRecord,
} from "@/lib/staff-messages/types";
import { formatUserListName, formatUserName } from "@/lib/users/names";
import { cn } from "@/lib/utils";

const SUGGESTION_LIMIT = 8;

const composeInputClass =
  "h-full w-full rounded-none border-0 bg-transparent px-0 text-sm font-medium leading-none text-foreground shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-0";

const composeRowClass = "flex h-11 items-center";
const composeLabelClass =
  "bg-muted/40 px-3 text-sm font-medium text-foreground";
const composeFieldClass = "min-w-0 px-3";

const labelClass = "text-sm font-medium text-foreground";

function priorityChoiceClass(
  priority: StaffMessageRecord["priority"],
  selected: boolean,
  muted = false
): string {
  if (muted) {
    return "border-border/70 bg-muted/15 text-muted-foreground hover:bg-muted/30 hover:text-foreground";
  }

  switch (priority) {
    case "sofort":
      return selected
        ? "border-rose-500/50 bg-rose-500/20 text-rose-950 dark:text-rose-100"
        : "border-rose-500/40 bg-rose-500/[0.06] text-rose-950 hover:bg-rose-500/10 dark:text-rose-100";
    case "heute":
      return selected
        ? "border-amber-500/50 bg-amber-500/20 text-amber-950 dark:text-amber-100"
        : "border-amber-500/40 bg-amber-500/[0.06] text-amber-950 hover:bg-amber-500/10 dark:text-amber-100";
    case "diese_woche":
    case "andere":
      return selected
        ? "border-sky-500/50 bg-sky-500/20 text-sky-950 dark:text-sky-100"
        : "border-sky-500/40 bg-sky-500/[0.06] text-sky-950 hover:bg-sky-500/10 dark:text-sky-100";
    default:
      return selected
        ? "border-border bg-muted text-foreground"
        : "border-border/70 bg-muted/20 text-foreground hover:bg-muted/40";
  }
}

type StaffMessagesViewProps = {
  colleagues: StaffMessageColleague[];
  module: ContentModule;
  currentUserId: string;
};

const EMPTY_FORM = {
  recipientId: "",
  topic: "",
  priority: "" as "" | StaffMessageRecord["priority"],
  dueDate: "",
  body: "",
};

export function StaffMessagesView({
  colleagues,
  module,
  currentUserId,
}: StaffMessagesViewProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [colleagueQuery, setColleagueQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [recipientUsage, setRecipientUsage] = useState<Record<string, number>>(
    {}
  );
  const [isPending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"compose" | "sent">("compose");
  const [sentRecipientName, setSentRecipientName] = useState("");
  const dueDateInputRef = useRef<HTMLInputElement>(null);
  const recipientFieldRef = useRef<HTMLDivElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const overviewHref = areaBasePath(module as AppModuleId);

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
  const composedBody = hasSession
    ? mergeSessionIntoInput(form.body, blocks)
    : form.body;

  useLayoutEffect(() => {
    if (hasSession) {
      return;
    }
    const el = bodyTextareaRef.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 144)}px`;
  }, [form.body, hasSession]);

  const selectedColleague = useMemo(
    () => colleagues.find((colleague) => colleague.id === form.recipientId) ?? null,
    [colleagues, form.recipientId]
  );

  const filteredColleagues = useMemo(() => {
    const query = colleagueQuery.trim().toLowerCase();
    if (!query) {
      return colleagues;
    }
    return colleagues.filter(
      (colleague) =>
        colleague.name.toLowerCase().includes(query) ||
        colleague.firstName.toLowerCase().includes(query) ||
        colleague.lastName.toLowerCase().includes(query) ||
        colleague.email.toLowerCase().includes(query)
    );
  }, [colleagueQuery, colleagues]);

  const { frequent: frequentColleagues, allAlphabetical: alphabeticalColleagues } =
    useMemo(
      () => splitColleaguesByUsage(colleagues, recipientUsage),
      [colleagues, recipientUsage]
    );

  const phonebookColumns = useMemo(
    () => groupColleaguesByPhonebookColumns(alphabeticalColleagues),
    [alphabeticalColleagues]
  );

  const suggestions = useMemo(() => {
    const query = colleagueQuery.trim();
    if (!query) {
      return frequentColleagues.slice(0, SUGGESTION_LIMIT);
    }
    return filteredColleagues.slice(0, SUGGESTION_LIMIT);
  }, [colleagueQuery, filteredColleagues, frequentColleagues]);

  const showSuggestions =
    suggestionsOpen && !pickerOpen && suggestions.length > 0 && !selectedColleague;

  useEffect(() => {
    setRecipientUsage(getRecipientUsageCounts(currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!recipientFieldRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectColleague(colleague: StaffMessageColleague) {
    setForm((current) => ({
      ...current,
      recipientId: colleague.id,
    }));
    setColleagueQuery(formatUserName(colleague));
    setPickerOpen(false);
    setSuggestionsOpen(false);
  }

  function clearRecipient() {
    setForm((current) => ({
      ...current,
      recipientId: "",
    }));
    setColleagueQuery("");
    setSuggestionsOpen(false);
  }

  function handleRecipientQueryChange(value: string) {
    setColleagueQuery(value);
    setPickerOpen(false);
    setSuggestionsOpen(true);
    if (
      selectedColleague &&
      value !== formatUserName(selectedColleague)
    ) {
      setForm((current) => ({
        ...current,
        recipientId: "",
      }));
    }
  }

  function resetCompose() {
    setForm(EMPTY_FORM);
    setAttachments([]);
    setColleagueQuery("");
    setPickerOpen(false);
    setSuggestionsOpen(false);
    discardSession();
  }

  function acceptDictation(sessionBlocks: DictationBlock[] = blocks) {
    if (!flattenBlocks(sessionBlocks).trim() && sessionBlocks.length === 0) {
      discardSession();
      return;
    }
    setForm((current) => ({
      ...current,
      body: mergeSessionIntoInput(current.body, sessionBlocks),
    }));
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

  async function copyMessageBody() {
    const text = composedBody.trim();
    if (!text) {
      toast.error("Keine Nachricht zum Kopieren.");
      return;
    }
    try {
      await navigator.clipboard.writeText(composedBody);
      toast.success("Nachricht in die Zwischenablage kopiert.");
    } catch {
      toast.error("Kopieren nicht möglich.");
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (listening) {
      toast.error("Bitte zuerst das Diktat beenden.");
      return;
    }

    for (const file of attachments) {
      const fileError = validateStaffMessageFile(file);
      if (fileError) {
        toast.error(fileError);
        return;
      }
    }

    const formData = new FormData(event.currentTarget);
    formData.set("module", module);
    formData.delete("files");
    for (const file of attachments) {
      formData.append("files", file);
    }

    startTransition(async () => {
      const result = await createStaffMessage(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      recordRecipientUse(currentUserId, result.item.recipientId);
      setRecipientUsage(getRecipientUsageCounts(currentUserId));
      setSentRecipientName(result.item.recipientName);
      resetCompose();
      setPhase("sent");
    });
  }

  function removeAttachment(index: number) {
    setAttachments((current) => current.filter((_, i) => i !== index));
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
      {colleagues.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SendIcon />
            </EmptyMedia>
            <EmptyTitle>Keine Kolleginnen oder Kollegen</EmptyTitle>
            <EmptyDescription>
              In Ihrer Kanzlei gibt es derzeit keine weiteren Benutzer für
              interne Nachrichten.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : phase === "sent" ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12 text-center">
          <p className="max-w-lg font-heading text-2xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
            {sentRecipientName
              ? `Ihre Nachricht wurde erfolgreich an ${sentRecipientName} versendet.`
              : "Ihre Nachricht wurde erfolgreich versendet."}
          </p>
          <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setSentRecipientName("");
                setPhase("compose");
              }}
              className={cn(
                "feature-card group block p-6 text-left",
                "hover:border-emerald-200/80 hover:bg-gradient-to-br hover:from-emerald-50/50 hover:to-white"
              )}
            >
              <div className="flex size-11 items-center justify-center rounded-none bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/70">
                <SquarePenIcon className="size-5" />
              </div>
              <div className="mt-5 space-y-2">
                <h3 className="font-heading text-lg font-medium tracking-tight">
                  Neue Nachricht schreiben
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Direkt eine weitere Nachricht an einen Mitarbeiter senden.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                Weiter
                <ArrowRightIcon className="size-4" />
              </div>
            </button>
            <Link
              href={overviewHref}
              className={cn(
                "feature-card group block p-6 text-left",
                "hover:border-amber-200/80 hover:bg-gradient-to-br hover:from-amber-50/50 hover:to-white"
              )}
            >
              <div className="flex size-11 items-center justify-center rounded-none bg-amber-100 text-amber-800 ring-1 ring-amber-200/70">
                <HomeIcon className="size-5" />
              </div>
              <div className="mt-5 space-y-2">
                <h3 className="font-heading text-lg font-medium tracking-tight">
                  Zurück zu Übersicht
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Zum Bereichsstart mit allen Funktionen zurückkehren.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-amber-700">
                Öffnen
                <ArrowRightIcon className="size-4" />
              </div>
            </Link>
          </div>
        </section>
      ) : (
        <section className="surface-card mt-8 space-y-6 p-5 sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div ref={recipientFieldRef} className="space-y-0">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-stretch border border-border">
                <div className={cn(composeRowClass, composeLabelClass)}>
                  Mitarbeiter auswählen
                </div>
                <div className={cn(composeRowClass, composeFieldClass, "gap-2 overflow-hidden")}>
                  <Input
                    id="staff-message-recipient"
                    value={colleagueQuery}
                    onChange={(event) =>
                      handleRecipientQueryChange(event.target.value)
                    }
                    onFocus={() => {
                      setSuggestionsOpen(true);
                    }}
                    placeholder="Name eintippen…"
                    className={cn(composeInputClass, "min-w-0")}
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={showSuggestions || pickerOpen}
                  />
                  {selectedColleague ? (
                    <button
                      type="button"
                      onClick={clearRecipient}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Empfänger entfernen"
                    >
                      <XIcon className="size-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="ml-auto shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={pickerOpen ? "Auswahl schließen" : "Mitarbeiter auswählen"}
                    aria-pressed={pickerOpen}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => {
                      setPickerOpen((open) => !open);
                      setSuggestionsOpen(false);
                    }}
                  >
                    {pickerOpen ? (
                      <XIcon className="size-4" />
                    ) : (
                      <PlusIcon className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              <input type="hidden" name="recipientId" value={form.recipientId} />

              {showSuggestions ? (
                <ul className="border border-t-0 border-border bg-background">
                  {suggestions.map((colleague) => (
                    <li key={colleague.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
                        onClick={() => selectColleague(colleague)}
                      >
                        <span>{formatUserName(colleague)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {pickerOpen ? (
                <div className="max-h-80 overflow-y-auto border border-t-0 border-border bg-background p-4">
                  {alphabeticalColleagues.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-muted-foreground">
                      Keine Mitarbeiter verfügbar.
                    </p>
                  ) : (
                    <div
                      className={cn(
                        "grid gap-4 md:gap-5",
                        phonebookColumns.length >= 4
                          ? "grid-cols-2 md:grid-cols-4"
                          : phonebookColumns.length === 3
                            ? "grid-cols-2 md:grid-cols-3"
                            : phonebookColumns.length === 2
                              ? "grid-cols-2"
                              : "grid-cols-1"
                      )}
                    >
                      {phonebookColumns.map((column) => (
                        <div key={column.key} className="min-w-0 space-y-1.5">
                          <div className="sticky top-0 border-b border-border bg-background py-1.5 text-xs font-semibold tracking-[0.14em] text-foreground/70 uppercase">
                            {column.label}
                          </div>
                          <ul className="space-y-0.5">
                            {column.colleagues.map((colleague) => {
                              const selected =
                                colleague.id === form.recipientId;
                              return (
                                <li key={colleague.id}>
                                  <button
                                    type="button"
                                    className={cn(
                                      "flex w-full items-center justify-between gap-2 px-2 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/50",
                                      selected && "bg-muted"
                                    )}
                                    onClick={() => selectColleague(colleague)}
                                  >
                                    <span className="min-w-0 truncate">
                                      {formatUserListName(colleague)}
                                    </span>
                                    {selected ? (
                                      <CheckIcon className="size-4 shrink-0" />
                                    ) : null}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {colleagueQuery.trim() &&
              !selectedColleague &&
              !pickerOpen &&
              suggestionsOpen &&
              suggestions.length === 0 ? (
                <p className="border border-t-0 border-border px-3.5 py-3 text-sm text-muted-foreground">
                  Keine Treffer
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-stretch border border-border">
                <div className={cn(composeRowClass, composeLabelClass)}>
                  Betreff eingeben
                </div>
                <div className={cn(composeRowClass, composeFieldClass)}>
                  <Input
                    id="staff-message-topic"
                    name="topic"
                    value={form.topic}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        topic: event.target.value,
                      }))
                    }
                    placeholder="Folgendes Thema eintippen"
                    className={cn(composeInputClass, "min-w-0")}
                    autoComplete="off"
                  />
                </div>
              </div>
              {!STAFF_MESSAGE_TOPIC_PRESETS.some(
                (preset) => preset.label === form.topic
              ) ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Betreff Vorschläge
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {STAFF_MESSAGE_TOPIC_PRESETS.map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        className="rounded-full border border-border bg-muted/30 px-3.5 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-muted/50 hover:text-foreground"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            topic: preset.label,
                          }))
                        }
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <p className={labelClass}>Priorität</p>
                <div className="flex flex-wrap gap-2">
                  {STAFF_MESSAGE_PRIORITIES.map((entry) => {
                    const selected = form.priority === entry.value;
                    const muted = Boolean(form.priority) && !selected;
                    return (
                      <button
                        key={entry.value}
                        type="button"
                        aria-pressed={selected}
                        className={cn(
                          "inline-flex h-10 items-center rounded-none border px-4 text-sm font-medium leading-none transition-colors sm:px-5",
                          priorityChoiceClass(entry.value, selected, muted)
                        )}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            priority: entry.value,
                            dueDate: dueDateForStaffMessagePriority(entry.value),
                          }))
                        }
                      >
                        {entry.label}
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" name="priority" value={form.priority} />
                {form.priority !== "andere" ? (
                  <input
                    type="hidden"
                    name="dueDate"
                    value={germanDateToIso(form.dueDate)}
                  />
                ) : null}
              </div>

              {form.priority === "andere" ? (
                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-stretch border border-border">
                  <div className={cn(composeRowClass, composeLabelClass)}>
                    Datum
                  </div>
                  <div className={cn(composeRowClass, composeFieldClass, "gap-2")}>
                    <Input
                      id="staff-message-due-date"
                      value={form.dueDate}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="TT.MM.JJJJ"
                      onChange={(event) => {
                        const next = event.target.value;
                        const isDeleting = next.length < form.dueDate.length;
                        setForm((current) => ({
                          ...current,
                          dueDate: maskGermanDateInput(next, isDeleting),
                        }));
                      }}
                      className={cn(composeInputClass, "min-w-0")}
                    />
                    <input
                      type="hidden"
                      name="dueDate"
                      value={germanDateToIso(form.dueDate)}
                    />
                    <input
                      ref={dueDateInputRef}
                      type="date"
                      tabIndex={-1}
                      aria-hidden="true"
                      className="sr-only"
                      value={germanDateToIso(form.dueDate)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          dueDate: isoToGermanDate(event.target.value),
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="ml-auto shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Kalender öffnen"
                      onClick={() => {
                        dueDateInputRef.current?.showPicker?.();
                        dueDateInputRef.current?.focus();
                      }}
                    >
                      <CalendarIcon className="size-4" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-2 pb-4">
              <Label htmlFor="body" className={labelClass}>
                Nachricht
              </Label>
              <input type="hidden" name="body" value={composedBody} />
              <div
                className={cn(
                  "flex flex-col gap-4 rounded-3xl border border-border/70 bg-background p-4 shadow-[var(--shadow-elevated)]",
                  "ring-1 ring-foreground/[0.03]",
                  hasSession && "border-foreground/30 ring-foreground/10"
                )}
              >
                {hasSession ? (
                  <SessionPreview
                    baseInput={form.body}
                    blocks={blocks}
                    listening={listening}
                  />
                ) : (
                  <textarea
                    ref={bodyTextareaRef}
                    id="body"
                    value={form.body}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        body: event.target.value,
                      }))
                    }
                    placeholder="Nachricht eingeben oder diktieren…"
                    rows={1}
                    className={cn(
                      "min-h-36 w-full resize-none overflow-hidden border-0 bg-transparent",
                      "text-base leading-relaxed outline-none placeholder:text-muted-foreground/70",
                      "focus-visible:ring-0"
                    )}
                    aria-label="Nachricht"
                  />
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {hasSession ? (
                    <>
                      <Button
                        type="button"
                        onClick={() => acceptDictation()}
                        disabled={!canAcceptSession}
                        className="h-9 rounded-full px-3.5"
                      >
                        <CheckIcon data-icon="inline-start" />
                        Übernehmen
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={discardSession}
                        className="h-9 rounded-full px-3.5"
                      >
                        <XIcon data-icon="inline-start" />
                        Verwerfen
                      </Button>
                    </>
                  ) : null}

                  <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
                    {listening ? (
                      <span className="text-xs text-muted-foreground">
                        Hört zu…
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void copyMessageBody()}
                        className="h-9 rounded-full px-3.5"
                      >
                        <CopyIcon data-icon="inline-start" />
                        Kopieren
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant={listening ? "default" : "outline"}
                      onClick={handleMicClick}
                      aria-pressed={listening}
                      aria-label={
                        listening ? "Diktieren stoppen" : "Nachricht diktieren"
                      }
                      title={
                        listening ? "Diktieren stoppen" : "Nachricht diktieren"
                      }
                      className={cn(
                        "h-9 rounded-full px-3.5",
                        listening && "animate-pulse"
                      )}
                    >
                      {listening ? (
                        <MicOffIcon data-icon="inline-start" className="size-4" />
                      ) : (
                        <MicIcon data-icon="inline-start" className="size-4" />
                      )}
                      {listening ? "Diktieren stoppen" : "Diktieren"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-0">
              <div className="relative grid grid-cols-[auto_minmax(0,1fr)] items-stretch border border-border">
                <div className={cn(composeRowClass, composeLabelClass)}>
                  Dokument anhängen
                </div>
                <div
                  className={cn(
                    composeRowClass,
                    composeFieldClass,
                    "w-full gap-2"
                  )}
                >
                  <span className="min-w-0 truncate text-sm font-medium leading-none text-muted-foreground">
                    {attachments.length === 0
                      ? "Dokumente & Bilder auswählen…"
                      : `${attachments.length} ${
                          attachments.length === 1 ? "Datei" : "Dateien"
                        } ausgewählt`}
                  </span>
                  <PaperclipIcon className="ml-auto size-4 shrink-0 text-muted-foreground" />
                </div>
                <input
                  id="staff-message-files"
                  type="file"
                  multiple
                  className="absolute inset-0 z-10 cursor-pointer opacity-0"
                  aria-label="Dateien auswählen, mehrere gleichzeitig möglich"
                  onChange={(event) => {
                    const next = [...(event.target.files ?? [])];
                    if (next.length === 0) {
                      return;
                    }
                    for (const file of next) {
                      const fileError = validateStaffMessageFile(file);
                      if (fileError) {
                        toast.error(`${file.name}: ${fileError}`);
                        event.target.value = "";
                        return;
                      }
                    }
                    setAttachments((current) => [...current, ...next]);
                    event.target.value = "";
                  }}
                />
              </div>
              {attachments.length > 0 ? (
                <ul className="border border-t-0 border-border bg-background">
                  {attachments.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-3 px-3.5 py-3 text-sm"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {file.name}{" "}
                        <span className="font-normal text-muted-foreground">
                          ({formatFileSize(file.size)})
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Anhang entfernen"
                      >
                        <XIcon className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isPending || listening || !form.recipientId}
                className="h-10 min-w-36 px-6"
              >
                <SendIcon data-icon="inline-start" />
                {listening ? "Diktat beenden…" : "Senden"}
              </Button>
            </div>
          </form>
        </section>
      )}

    </div>
  );
}

function SessionPreview({
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
      className="min-h-36 w-full whitespace-pre-wrap text-base leading-relaxed"
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
