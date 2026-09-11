"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, MicIcon, MicOffIcon, PaperclipIcon, PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { functionHref } from "@/lib/area/paths";
import {
  mergeDictationIntoValue,
  useSimpleDictation,
} from "@/lib/dictation/use-simple-dictation";
import type { AppModuleId } from "@/lib/modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createStaffMessage } from "@/lib/staff-messages/actions";
import {
  getRecipientUsageCounts,
  groupColleaguesByPhonebookColumns,
  recordRecipientUse,
  splitColleaguesByUsage,
} from "@/lib/staff-messages/recipient-usage";
import {
  formatMatterLabel,
  getMatterUsageCounts,
  groupMattersByPhonebookColumns,
  recordMatterUse,
  splitMattersByUsage,
} from "@/lib/staff-messages/matter-picker";
import {
  dueDateForStaffMessagePriority,
  STAFF_MESSAGE_COMPOSE_PRIORITIES,
  STAFF_MESSAGE_INTENTS,
  STAFF_MESSAGE_TOPIC_CUSTOM,
  STAFF_MESSAGE_TOPIC_PRESETS,
  priorityActiveClass,
  priorityBadgeClass,
  validateStaffMessageFile,
  type StaffMessageColleague,
  type StaffMatterOption,
  type StaffMessageIntent,
  type StaffMessagePriority,
} from "@/lib/staff-messages/types";
import { formatUserListName, formatUserName } from "@/lib/users/names";
import { cn } from "@/lib/utils";

const SUGGESTION_LIMIT = 8;

const composeInputClass =
  "h-full w-full rounded-none border-0 bg-transparent px-0 text-base font-medium leading-none text-foreground shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-0";

type Props = {
  colleagues: StaffMessageColleague[];
  matters: StaffMatterOption[];
  module: AppModuleId;
  currentUserId: string;
};

export function AuftragComposeView({
  colleagues,
  matters,
  module,
  currentUserId,
}: Props) {
  const router = useRouter();
  const recipientFieldRef = useRef<HTMLDivElement>(null);
  const matterFieldRef = useRef<HTMLDivElement>(null);
  const bodyFileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [ballHolderId, setBallHolderId] = useState("");
  const [colleagueQuery, setColleagueQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [recipientUsage, setRecipientUsage] = useState<Record<string, number>>(
    {}
  );
  const [matterId, setMatterId] = useState("");
  const [matterQuery, setMatterQuery] = useState("");
  const [matterPickerOpen, setMatterPickerOpen] = useState(false);
  const [matterSuggestionsOpen, setMatterSuggestionsOpen] = useState(false);
  const [matterUsage, setMatterUsage] = useState<Record<string, number>>({});
  const [topicKey, setTopicKey] = useState(STAFF_MESSAGE_TOPIC_CUSTOM);
  const [topic, setTopic] = useState("");
  const [intent, setIntent] = useState<StaffMessageIntent>("erledigen");
  const [priority, setPriority] = useState<StaffMessagePriority | "">("");
  const [dueDate, setDueDate] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const {
    listening: bodyListening,
    liveText: bodyDictationLive,
    hasSession: bodyDictationOpen,
    startListening: startBodyDictation,
    stopListening: stopBodyDictation,
    discardSession: discardBodyDictation,
  } = useSimpleDictation();

  function acceptBodyDictation(dictated = stopBodyDictation()) {
    const trimmed = dictated.trim();
    if (!trimmed) {
      discardBodyDictation();
      return;
    }
    setBody((prev) => mergeDictationIntoValue(prev, trimmed));
    discardBodyDictation();
  }

  function handleBodyMicClick() {
    if (bodyListening) {
      acceptBodyDictation(stopBodyDictation());
      return;
    }
    startBodyDictation();
  }

  const selectedColleague = useMemo(() => {
    if (ballHolderId === currentUserId) {
      return {
        id: currentUserId,
        firstName: "",
        lastName: "",
        name: "Ich (Selbst)",
        email: "",
      } satisfies StaffMessageColleague;
    }
    return colleagues.find((c) => c.id === ballHolderId) ?? null;
  }, [colleagues, ballHolderId, currentUserId]);

  const filteredColleagues = useMemo(() => {
    const query = colleagueQuery.trim().toLowerCase();
    if (!query) return colleagues;
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
    suggestionsOpen &&
    !pickerOpen &&
    suggestions.length > 0 &&
    !selectedColleague;

  const selectedMatter = useMemo(
    () => matters.find((m) => m.id === matterId) ?? null,
    [matters, matterId]
  );

  const filteredMatters = useMemo(() => {
    const query = matterQuery.trim().toLowerCase();
    if (!query) return matters;
    return matters.filter(
      (matter) =>
        matter.clientName.toLowerCase().includes(query) ||
        matter.title.toLowerCase().includes(query) ||
        matter.reference.toLowerCase().includes(query)
    );
  }, [matterQuery, matters]);

  const { frequent: frequentMatters, allAlphabetical: alphabeticalMatters } =
    useMemo(
      () => splitMattersByUsage(matters, matterUsage),
      [matters, matterUsage]
    );

  const matterPhonebookColumns = useMemo(
    () => groupMattersByPhonebookColumns(alphabeticalMatters),
    [alphabeticalMatters]
  );

  const matterSuggestions = useMemo(() => {
    const query = matterQuery.trim();
    if (!query) {
      return frequentMatters.slice(0, SUGGESTION_LIMIT);
    }
    return filteredMatters.slice(0, SUGGESTION_LIMIT);
  }, [matterQuery, filteredMatters, frequentMatters]);

  const showMatterSuggestions =
    matterSuggestionsOpen &&
    !matterPickerOpen &&
    matterSuggestions.length > 0 &&
    !selectedMatter;

  useEffect(() => {
    setRecipientUsage(getRecipientUsageCounts(currentUserId));
    setMatterUsage(getMatterUsageCounts(currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!recipientFieldRef.current?.contains(target)) {
        setSuggestionsOpen(false);
      }
      if (!matterFieldRef.current?.contains(target)) {
        setMatterSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectColleague(colleague: StaffMessageColleague) {
    setBallHolderId(colleague.id);
    setColleagueQuery(formatUserName(colleague));
    setPickerOpen(false);
    setSuggestionsOpen(false);
  }

  function selectSelf() {
    setBallHolderId(currentUserId);
    setColleagueQuery("Ich (Selbst)");
    setPickerOpen(false);
    setSuggestionsOpen(false);
  }

  function clearRecipient() {
    setBallHolderId("");
    setColleagueQuery("");
    setSuggestionsOpen(false);
  }

  function selectMatter(matter: StaffMatterOption) {
    setMatterId(matter.id);
    setMatterQuery(formatMatterLabel(matter));
    setMatterPickerOpen(false);
    setMatterSuggestionsOpen(false);
  }

  function clearMatter() {
    setMatterId("");
    setMatterQuery("");
    setMatterSuggestionsOpen(false);
  }

  function handleMatterQueryChange(value: string) {
    setMatterQuery(value);
    setMatterPickerOpen(false);
    setMatterSuggestionsOpen(true);
    if (selectedMatter && value !== formatMatterLabel(selectedMatter)) {
      setMatterId("");
    }
  }

  function handleRecipientQueryChange(value: string) {
    setColleagueQuery(value);
    setPickerOpen(false);
    setSuggestionsOpen(true);
    if (
      selectedColleague &&
      value !==
        (selectedColleague.id === currentUserId
          ? "Ich (Selbst)"
          : formatUserName(selectedColleague))
    ) {
      setBallHolderId("");
    }
  }

  function applyPreset(key: string) {
    const preset = STAFF_MESSAGE_TOPIC_PRESETS.find((p) => p.key === key);
    if (!preset) {
      setTopicKey(STAFF_MESSAGE_TOPIC_CUSTOM);
      return;
    }
    setTopicKey(preset.key);
    setTopic(preset.label);
  }

  function selectIntent(next: StaffMessageIntent) {
    setIntent(next);
    const currentPreset = STAFF_MESSAGE_TOPIC_PRESETS.find(
      (preset) => preset.key === topicKey
    );
    if (currentPreset && currentPreset.intent !== next) {
      setTopicKey(STAFF_MESSAGE_TOPIC_CUSTOM);
      setTopic("");
    }
  }

  const titlePresetsForIntent = useMemo(
    () =>
      STAFF_MESSAGE_TOPIC_PRESETS.filter((preset) => preset.intent === intent),
    [intent]
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ballHolderId) {
      toast.error("Bitte einen Mitarbeiter wählen.");
      return;
    }
    if (!topic.trim()) {
      toast.error("Bitte einen Betreff angeben.");
      return;
    }

    const formData = new FormData();
    formData.set("ballHolderId", ballHolderId);
    formData.set("topicKey", topicKey);
    formData.set("topic", topic);
    formData.set("intent", intent);
    formData.set("priority", priority || "keine");
    formData.set("dueDate", dueDate);
    formData.set("body", body);
    formData.set("module", module);
    formData.set("matterId", matterId);
    for (const file of files) {
      formData.append("files", file);
    }

    startTransition(async () => {
      const result = await createStaffMessage(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (ballHolderId !== currentUserId) {
        recordRecipientUse(currentUserId, ballHolderId);
      }
      if (matterId) {
        recordMatterUse(currentUserId, matterId);
      }
      toast.success("Auftrag gesendet.");
      router.push(functionHref(module, "inbox-sent"));
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <h1 className="font-heading text-3xl font-medium tracking-tight">
        Auftrag schreiben
      </h1>

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Mitarbeiter
          </h2>

          <div ref={recipientFieldRef} className="space-y-0">
            <div className="flex h-12 items-center gap-2 overflow-hidden border border-border px-3">
              <Input
                id="auftrag-recipient"
                value={colleagueQuery}
                onChange={(event) =>
                  handleRecipientQueryChange(event.target.value)
                }
                onFocus={() => setSuggestionsOpen(true)}
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
                  aria-label="Mitarbeiter entfernen"
                >
                  <XIcon className="size-4" />
                </button>
              ) : null}
              <button
                type="button"
                className="ml-auto shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={
                  pickerOpen ? "Telefonbuch schließen" : "Telefonbuch öffnen"
                }
                aria-pressed={pickerOpen}
                onMouseDown={(event) => event.preventDefault()}
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

            {showSuggestions ? (
              <ul className="border border-t-0 border-border bg-background">
                {suggestions.map((colleague) => (
                  <li key={colleague.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left text-base font-medium text-foreground transition-colors hover:bg-muted/50"
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
                            const selected = colleague.id === ballHolderId;
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
                <button
                  type="button"
                  onClick={selectSelf}
                  className={cn(
                    "mt-4 w-full border border-dashed border-border/80 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground",
                    ballHolderId === currentUserId &&
                      "border-border bg-muted/50 text-foreground"
                  )}
                >
                  {ballHolderId === currentUserId
                    ? "An mich · ausgewählt"
                    : "An mich"}
                </button>
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
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Akte / Mandant
          </h2>

          <div ref={matterFieldRef} className="space-y-0">
            <div className="flex h-12 items-center gap-2 overflow-hidden border border-border px-3">
              <Input
                id="auftrag-matter"
                value={matterQuery}
                onChange={(event) =>
                  handleMatterQueryChange(event.target.value)
                }
                onFocus={() => setMatterSuggestionsOpen(true)}
                placeholder="Akte oder Mandant eintippen…"
                className={cn(composeInputClass, "min-w-0")}
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={showMatterSuggestions || matterPickerOpen}
              />
              {selectedMatter ? (
                <button
                  type="button"
                  onClick={clearMatter}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Akte entfernen"
                >
                  <XIcon className="size-4" />
                </button>
              ) : null}
              <button
                type="button"
                className="ml-auto shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={
                  matterPickerOpen
                    ? "Aktenliste schließen"
                    : "Aktenliste öffnen"
                }
                aria-pressed={matterPickerOpen}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setMatterPickerOpen((open) => !open);
                  setMatterSuggestionsOpen(false);
                }}
              >
                {matterPickerOpen ? (
                  <XIcon className="size-4" />
                ) : (
                  <PlusIcon className="size-4" />
                )}
              </button>
            </div>

            {showMatterSuggestions ? (
              <ul className="border border-t-0 border-border bg-background">
                {matterSuggestions.map((matter) => (
                  <li key={matter.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left text-base font-medium text-foreground transition-colors hover:bg-muted/50"
                      onClick={() => selectMatter(matter)}
                    >
                      <span className="min-w-0 truncate">
                        {formatMatterLabel(matter)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {matterPickerOpen ? (
              <div className="max-h-80 overflow-y-auto border border-t-0 border-border bg-background p-4">
                {alphabeticalMatters.length === 0 ? (
                  <p className="px-1 py-2 text-sm text-muted-foreground">
                    Keine Akten verfügbar.
                  </p>
                ) : (
                  <div
                    className={cn(
                      "grid gap-4 md:gap-5",
                      matterPhonebookColumns.length >= 4
                        ? "grid-cols-2 md:grid-cols-4"
                        : matterPhonebookColumns.length === 3
                          ? "grid-cols-2 md:grid-cols-3"
                          : matterPhonebookColumns.length === 2
                            ? "grid-cols-2"
                            : "grid-cols-1"
                    )}
                  >
                    {matterPhonebookColumns.map((column) => (
                      <div key={column.key} className="min-w-0 space-y-1.5">
                        <div className="sticky top-0 border-b border-border bg-background py-1.5 text-xs font-semibold tracking-[0.14em] text-foreground/70 uppercase">
                          {column.label}
                        </div>
                        <ul className="space-y-0.5">
                          {column.matters.map((matter) => {
                            const selected = matter.id === matterId;
                            return (
                              <li key={matter.id}>
                                <button
                                  type="button"
                                  className={cn(
                                    "flex w-full flex-col items-start gap-0.5 px-2 py-2 text-left transition-colors hover:bg-muted/50",
                                    selected && "bg-muted"
                                  )}
                                  onClick={() => selectMatter(matter)}
                                >
                                  <span className="flex w-full items-center justify-between gap-2 text-sm font-medium text-foreground">
                                    <span className="min-w-0 truncate">
                                      {matter.clientName}
                                    </span>
                                    {selected ? (
                                      <CheckIcon className="size-4 shrink-0" />
                                    ) : null}
                                  </span>
                                  <span className="min-w-0 truncate text-xs text-muted-foreground">
                                    {matter.title}
                                    {matter.reference
                                      ? ` (${matter.reference})`
                                      : ""}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={clearMatter}
                  className="mt-4 w-full border border-dashed border-border/80 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                >
                  Ohne Akte / Mandant
                </button>
              </div>
            ) : null}

            {matterQuery.trim() &&
            !selectedMatter &&
            !matterPickerOpen &&
            matterSuggestionsOpen &&
            matterSuggestions.length === 0 ? (
              <p className="border border-t-0 border-border px-3.5 py-3 text-sm text-muted-foreground">
                Keine Treffer
              </p>
            ) : null}
          </div>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-sm font-medium text-muted-foreground">
            Vorgehen
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {STAFF_MESSAGE_INTENTS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => selectIntent(entry.value)}
                className={cn(
                  "rounded-none border px-3 py-2 text-sm transition-colors",
                  intent === entry.value
                    ? "border-foreground bg-muted font-medium"
                    : "border-border hover:bg-muted/40"
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-sm font-medium text-muted-foreground">Betreff</h2>
          <input
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setTopicKey(STAFF_MESSAGE_TOPIC_CUSTOM);
            }}
            placeholder="Betreff eingeben…"
            className="h-12 w-full rounded-none border border-border bg-background px-3 text-base md:text-sm"
          />
          {titlePresetsForIntent.length > 0 &&
          (!topic.trim() || topicKey === STAFF_MESSAGE_TOPIC_CUSTOM) ? (
            <div className="mt-3 space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">
                Vorschläge für Betreff
              </p>
              <div className="flex flex-wrap gap-1.5">
                {titlePresetsForIntent.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset.key)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      topicKey === preset.key
                        ? "border-foreground bg-muted font-medium text-foreground"
                        : "border-border bg-muted/30 text-foreground/80 hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="space-y-1.5">
          <h2 className="text-sm font-medium text-muted-foreground">
            Priorität
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {STAFF_MESSAGE_COMPOSE_PRIORITIES.map((entry) => {
              const selected = priority === entry.value;
              const noneSelected = priority === "";
              return (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => {
                    setPriority(entry.value);
                    setDueDate(dueDateForStaffMessagePriority(entry.value));
                  }}
                  className={cn(
                    "rounded-none border px-3 py-2 text-sm transition-colors",
                    selected
                      ? cn(priorityActiveClass(entry.value), "font-medium")
                      : noneSelected
                        ? cn(
                            priorityBadgeClass(entry.value),
                            "hover:opacity-90"
                          )
                        : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Bemerkung
          </h2>
          <div
            className={cn(
              "flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/90 px-4 pt-3.5 pb-3",
              "shadow-[var(--shadow-soft)] transition-[border-color,box-shadow] duration-200",
              "focus-within:border-foreground/25 focus-within:shadow-[var(--shadow-elevated)]",
              bodyDictationOpen &&
                "border-foreground/30 shadow-[var(--shadow-elevated)]"
            )}
          >
            {bodyDictationOpen ? (
              <div className="max-h-56 min-h-[4.5rem] overflow-y-auto px-0.5 py-1 text-base leading-relaxed md:text-sm">
                <p className="whitespace-pre-wrap">
                  {body.trim() ? (
                    <span className="text-foreground not-italic">
                      {body}
                      {/\s$/.test(body) ? "" : " "}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground italic">
                    {bodyDictationLive ||
                      (bodyListening
                        ? "Bitte sprechen…"
                        : "Diktat bereit zum Übernehmen")}
                  </span>
                </p>
              </div>
            ) : (
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Optional — tippen oder diktieren…"
                rows={2}
                className={cn(
                  "max-h-56 min-h-[4.5rem] w-full resize-none overflow-y-auto border-0 bg-transparent px-0.5 py-1",
                  "text-base leading-relaxed shadow-none md:text-sm",
                  "placeholder:text-muted-foreground/55 focus-visible:ring-0"
                )}
                aria-label="Bemerkung"
              />
            )}
            <div
              className={cn(
                "flex items-center gap-2 pt-0.5",
                bodyDictationOpen ? "justify-between" : "justify-end"
              )}
            >
              {bodyDictationOpen ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => acceptBodyDictation()}
                    disabled={!bodyDictationLive.trim()}
                    className="h-8 rounded-md px-3"
                  >
                    <CheckIcon data-icon="inline-start" className="size-3.5" />
                    Übernehmen
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={discardBodyDictation}
                    className="h-8 rounded-md px-3"
                  >
                    <XIcon data-icon="inline-start" className="size-3.5" />
                    Verwerfen
                  </Button>
                </div>
              ) : null}
              <div className="flex shrink-0 items-center gap-2">
                {bodyListening ? (
                  <span className="text-xs text-muted-foreground">
                    Hört zu…
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant={bodyListening ? "default" : "ghost"}
                  size="icon"
                  onClick={handleBodyMicClick}
                  aria-pressed={bodyListening}
                  aria-label={
                    bodyListening ? "Diktieren beenden" : "Bemerkung diktieren"
                  }
                  title={
                    bodyListening ? "Diktieren beenden" : "Bemerkung diktieren"
                  }
                  className={cn(
                    "rounded-md",
                    !bodyListening &&
                      "text-muted-foreground hover:text-foreground",
                    bodyListening && "animate-pulse"
                  )}
                >
                  {bodyListening ? (
                    <MicOffIcon className="size-4" />
                  ) : (
                    <MicIcon className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-sm font-medium text-muted-foreground">
            Dokumente einfügen
          </h2>
          <input
            ref={bodyFileInputRef}
            type="file"
            multiple
            onChange={(e) => {
              const next = Array.from(e.target.files ?? []);
              for (const file of next) {
                const err = validateStaffMessageFile(file);
                if (err) {
                  toast.error(err);
                  return;
                }
              }
              setFiles((prev) => {
                const byKey = new Map(
                  prev.map((file) => [
                    `${file.name}:${file.size}:${file.lastModified}`,
                    file,
                  ])
                );
                for (const file of next) {
                  byKey.set(
                    `${file.name}:${file.size}:${file.lastModified}`,
                    file
                  );
                }
                return Array.from(byKey.values());
              });
              if (bodyFileInputRef.current) {
                bodyFileInputRef.current.value = "";
              }
            }}
            className="sr-only"
          />
          <button
            type="button"
            onClick={() => bodyFileInputRef.current?.click()}
            className={cn(
              "flex h-12 w-full items-center gap-2 rounded-none border border-border bg-background px-3 text-left text-base md:text-sm",
              "hover:bg-muted/30"
            )}
          >
            <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate text-muted-foreground/80">
              Dokument auswählen…
            </span>
          </button>
          {files.length > 0 ? (
            <ul className="space-y-1">
              {files.map((file) => {
                const key = `${file.name}:${file.size}:${file.lastModified}`;
                return (
                  <li
                    key={key}
                    className="flex h-12 items-center gap-2 border border-border bg-background px-3 text-base md:text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFiles((prev) =>
                          prev.filter(
                            (entry) =>
                              `${entry.name}:${entry.size}:${entry.lastModified}` !==
                              key
                          )
                        );
                      }}
                      aria-label={`${file.name} entfernen`}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        <Button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-none text-base"
        >
          {pending ? "Senden…" : "Senden"}
        </Button>
      </form>
    </div>
  );
}
