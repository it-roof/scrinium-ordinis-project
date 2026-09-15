"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { IconArrowRight, IconHome, IconPlus } from "@tabler/icons-react";
import { CheckIcon, MicIcon, PaperclipIcon, PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/v1/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/v1/ui/card";
import { Input } from "@/components/v1/ui/input";
import { Textarea } from "@/components/v1/ui/textarea";
import {
  mergeDictationIntoValue,
  useSimpleDictation,
} from "@/lib/dictation/use-simple-dictation";
import { useAudioWaveform } from "@/lib/dictation/use-audio-waveform";
import type { AppModuleId } from "@/lib/modules";
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
  "h-full w-full rounded-md border-0 bg-transparent px-0 text-base font-medium leading-none text-foreground shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-0";

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
  colleagues: StaffMessageColleague[];
  matters: StaffMatterOption[];
  module: AppModuleId;
  currentUserId: string;
};

export function V1AufgabenComposeView({
  colleagues,
  matters,
  module,
  currentUserId,
}: Props) {
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
  const [submitted, setSubmitted] = useState(false);
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
      stopBodyDictation();
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

  const { frequent: frequentColleagues } = useMemo(
      () => splitColleaguesByUsage(colleagues, recipientUsage),
      [colleagues, recipientUsage]
    );

  const phonebookColumns = useMemo(
    () => groupColleaguesByPhonebookColumns(filteredColleagues),
    [filteredColleagues]
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
        setPickerOpen(false);
      }
      if (!matterFieldRef.current?.contains(target)) {
        setMatterSuggestionsOpen(false);
        setMatterPickerOpen(false);
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

  function resetComposeForm() {
    setBallHolderId("");
    setColleagueQuery("");
    setPickerOpen(false);
    setSuggestionsOpen(false);
    setMatterId("");
    setMatterQuery("");
    setMatterPickerOpen(false);
    setMatterSuggestionsOpen(false);
    setTopicKey(STAFF_MESSAGE_TOPIC_CUSTOM);
    setTopic("");
    setIntent("erledigen");
    setPriority("");
    setDueDate("");
    setBody("");
    setFiles([]);
    discardBodyDictation();
    if (bodyFileInputRef.current) {
      bodyFileInputRef.current.value = "";
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ballHolderId) {
      toast.error("Mitarbeiter fehlt", {
        description: "Bitte einen Mitarbeiter auswählen.",
      });
      return;
    }
    if (!topic.trim()) {
      toast.error("Betreff fehlt", {
        description: "Bitte einen Betreff eingeben.",
      });
      return;
    }

    const recipientLabel = selectedColleague
      ? formatUserName(selectedColleague)
      : "Mitarbeiter";
    const topicLabel = topic.trim();

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
        toast.error("Zuweisen fehlgeschlagen", {
          description: result.error,
        });
        return;
      }
      if (ballHolderId !== currentUserId) {
        recordRecipientUse(currentUserId, ballHolderId);
      }
      if (matterId) {
        recordMatterUse(currentUserId, matterId);
      }
      setSubmitted(true);
      toast.success("Aufgabe zugewiesen", {
        description: `„${topicLabel}“ an ${recipientLabel} gesendet.`,
      });
    });
  }

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10 md:px-6">
        <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                resetComposeForm();
                setSubmitted(false);
              }}
              className="group block w-full text-left outline-none"
            >
              <Card
                className={cn(
                  "relative flex h-full flex-col border-border/80 bg-card py-0 shadow-none",
                  "transition-colors duration-200",
                  "hover:border-border hover:bg-muted/40",
                  "focus-visible:ring-2 focus-visible:ring-ring/40"
                )}
              >
                <CardHeader className="relative flex flex-1 flex-col gap-4 px-5 py-5">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-sky-100 text-sky-800 ring-1 ring-sky-200/70">
                    <IconPlus className="size-5" />
                  </div>
                  <div className="space-y-1.5">
                    <CardTitle className="font-heading text-lg font-medium tracking-tight">
                      Neue Aufgabe zuweisen
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      Direkt die nächste Aufgabe anlegen und zuweisen.
                    </CardDescription>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-sky-800/80 transition-colors duration-200 group-hover:text-sky-950">
                    Zuweisen
                    <IconArrowRight className="size-4" />
                  </span>
                </CardHeader>
              </Card>
            </button>

            <Link href="/v1/dashboard" className="group block outline-none">
              <Card
                className={cn(
                  "relative flex h-full flex-col border-border/80 bg-card py-0 shadow-none",
                  "transition-colors duration-200",
                  "hover:border-border hover:bg-muted/40",
                  "focus-visible:ring-2 focus-visible:ring-ring/40"
                )}
              >
                <CardHeader className="relative flex flex-1 flex-col gap-4 px-5 py-5">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-foreground/80 ring-1 ring-border/60">
                    <IconHome className="size-5" />
                  </div>
                  <div className="space-y-1.5">
                    <CardTitle className="font-heading text-lg font-medium tracking-tight">
                      Zurück zur Übersicht
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      Zur Übersicht und den weiteren Funktionen.
                    </CardDescription>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
                    Öffnen
                    <IconArrowRight className="size-4" />
                  </span>
                </CardHeader>
              </Card>
            </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-y-auto px-4 md:px-6">
      <header className="shrink-0 space-y-2 border-b border-border/15 pt-8 pb-6 md:pt-10 md:pb-8">
        <h1 className="font-heading text-3xl font-medium tracking-tight text-foreground md:text-[2.35rem] md:leading-[1.15]">
          Aufgabe zuweisen
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground md:text-[0.95rem]">
          Mitarbeiter wählen, Absicht festlegen und die Aufgabe zuweisen.
        </p>
      </header>

      <div className="py-6 md:py-8">
        <Card className="border-border/80 bg-card shadow-none">
          <CardContent className="px-5 py-6 md:px-6">
            <form onSubmit={onSubmit} className="space-y-6">
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Mitarbeiter
            <span className="text-muted-foreground" aria-hidden>
              {" "}
              *
            </span>
          </h2>

          <div ref={recipientFieldRef} className="space-y-0">
            <div className="overflow-hidden rounded-md border border-border/80 bg-background">
              <div className="flex h-11 items-center gap-2 px-3">
                <Input
                  id="auftrag-recipient"
                  value={colleagueQuery}
                  onChange={(event) =>
                    handleRecipientQueryChange(event.target.value)
                  }
                  onFocus={() => {
                    setPickerOpen(true);
                    setSuggestionsOpen(false);
                  }}
                  placeholder="Name eintippen…"
                  className={cn(composeInputClass, "min-w-0")}
                  autoComplete="off"
                  aria-required="true"
                  aria-autocomplete="list"
                  aria-expanded={showSuggestions || pickerOpen}
                />
                {selectedColleague && !pickerOpen ? (
                  <button
                    type="button"
                    onClick={clearRecipient}
                    className="ml-auto shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Mitarbeiter entfernen"
                  >
                    <XIcon className="size-4" />
                  </button>
                ) : (
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
                )}
              </div>

              {showSuggestions ? (
                <ul className="border-t border-border/40">
                  {suggestions.map((colleague) => (
                    <li key={colleague.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
                        onClick={() => selectColleague(colleague)}
                      >
                        <span>{formatUserName(colleague)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {pickerOpen ? (
                <div className="max-h-80 overflow-y-auto border-t border-border/40 p-4">
                  {filteredColleagues.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-muted-foreground">
                      {colleagueQuery.trim()
                        ? "Keine Treffer."
                        : "Keine Mitarbeiter verfügbar."}
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
                          <div className="sticky top-0 border-b border-border/40 bg-background py-1.5 text-xs font-semibold tracking-[0.14em] text-foreground/80 uppercase">
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
                                      "flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/50",
                                      selected && "bg-muted/70"
                                    )}
                                    onClick={() => selectColleague(colleague)}
                                  >
                                    <span className="min-w-0 truncate">
                                      {formatUserListName(colleague)}
                                    </span>
                                    {selected ? (
                                      <CheckIcon className="size-4 shrink-0 text-muted-foreground" />
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
                      "mt-4 w-full rounded-md border border-dashed border-border/60 px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground",
                      ballHolderId === currentUserId &&
                        "border-border/80 bg-muted/50 text-foreground"
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
                <p className="border-t border-border/40 px-3.5 py-3 text-sm text-muted-foreground">
                  Keine Treffer
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Akte / Mandant
          </h2>

          <div ref={matterFieldRef} className="space-y-0">
            <div className="overflow-hidden rounded-md border border-border/80 bg-background">
              <div className="flex h-11 items-center gap-2 px-3">
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
                {selectedMatter && !matterPickerOpen ? (
                  <button
                    type="button"
                    onClick={clearMatter}
                    className="ml-auto shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Akte entfernen"
                  >
                    <XIcon className="size-4" />
                  </button>
                ) : (
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
                )}
              </div>

              {showMatterSuggestions ? (
                <ul className="border-t border-border/40">
                  {matterSuggestions.map((matter) => (
                    <li key={matter.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
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
                <div className="max-h-80 overflow-y-auto border-t border-border/40 p-4">
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
                          <div className="sticky top-0 border-b border-border/40 bg-background py-1.5 text-xs font-semibold tracking-[0.14em] text-foreground/80 uppercase">
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
                                      "flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50",
                                      selected && "bg-muted/70"
                                    )}
                                    onClick={() => selectMatter(matter)}
                                  >
                                    <span className="flex w-full items-center justify-between gap-2 text-sm font-medium text-foreground">
                                      <span className="min-w-0 truncate">
                                        {matter.clientName}
                                      </span>
                                      {selected ? (
                                        <CheckIcon className="size-4 shrink-0 text-muted-foreground" />
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
                    className="mt-4 w-full rounded-md border border-dashed border-border/60 px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
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
                <p className="border-t border-border/40 px-3.5 py-3 text-sm text-muted-foreground">
                  Keine Treffer
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-sm font-medium text-muted-foreground">
            Vorgehen
            <span className="text-muted-foreground" aria-hidden>
              {" "}
              *
            </span>
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {STAFF_MESSAGE_INTENTS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => selectIntent(entry.value)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm transition-colors",
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
          <h2 className="text-sm font-medium text-muted-foreground">
            Betreff
            <span className="text-muted-foreground" aria-hidden>
              {" "}
              *
            </span>
          </h2>
          <input
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setTopicKey(STAFF_MESSAGE_TOPIC_CUSTOM);
            }}
            placeholder="Betreff eingeben…"
            required
            aria-required="true"
            className="h-11 w-full rounded-md border border-border/80 bg-background px-3 text-base md:text-sm"
          />
          {titlePresetsForIntent.length > 0 ? (
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
                    "rounded-md border px-3 py-2 text-sm transition-colors",
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

        <section className="space-y-1.5">
          <h2 className="text-sm font-medium text-muted-foreground">
            Bemerkung
          </h2>
          <div
            className={cn(
              "flex flex-col gap-2 rounded-md border border-border/80 bg-background px-3 pt-3 pb-2.5",
              bodyDictationOpen && "border-foreground/25"
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
                        ? "Hört zu…"
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
                  "placeholder:text-muted-foreground/55 focus-visible:border-0 focus-visible:ring-0"
                )}
                aria-label="Bemerkung"
              />
            )}
            <div className="flex items-center justify-end gap-1.5">
              {bodyDictationOpen ? (
                <>
                  <DictationWaveform active={bodyListening} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={discardBodyDictation}
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
                    onClick={() => acceptBodyDictation()}
                    disabled={!bodyDictationLive.trim()}
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
                  onClick={handleBodyMicClick}
                  aria-pressed={bodyListening}
                  aria-label="Bemerkung diktieren"
                  title="Bemerkung diktieren"
                  className="size-9 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <MicIcon className="size-4" />
                </Button>
              )}
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
                  toast.error("Datei nicht möglich", {
                    description: err,
                  });
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
              "flex h-11 w-full items-center gap-2 rounded-md border border-border/80 bg-background px-3 text-left text-base md:text-sm",
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
                    className="flex h-11 items-center gap-2 rounded-md border border-border/80 bg-background px-3 text-base md:text-sm"
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
          className="h-11 w-full rounded-md text-base"
        >
          {pending ? "Senden…" : "Senden"}
        </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
