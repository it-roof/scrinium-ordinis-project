"use client";

import { useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ClipboardPasteIcon,
  CopyIcon,
  FilePenLineIcon,
  FileTextIcon,
  FileUpIcon,
  FolderOpenIcon,
  DownloadIcon,
  MailIcon,
  MicIcon,
  MicOffIcon,
  PlusIcon,
  PrinterIcon,
  RotateCcwIcon,
  ScaleIcon,
  SearchIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  buildPromptKitOutput,
  buildPromptKitEmailOutput,
  getPromptKitGoal,
  PROMPT_KIT_CLIENT_LETTER,
  PROMPT_KIT_EMAIL,
  PROMPT_KIT_GOALS,
  PROMPT_KIT_RESULT_CHECK,
  type PromptKitAction,
  type PromptKitGoalId,
} from "@/lib/prompt-kit/catalog";
import {
  appendSectionToInput,
  blockJoinPrefix,
  flattenBlocks,
  mergeSessionIntoInput,
  sectionIsPresent,
  sessionHasSection,
  speechDisplayText,
  type DictationBlock,
} from "@/lib/prompt-kit/dictation";
import {
  extractThemaTitle,
} from "@/lib/prompt-kit/letter-draft";
import { parseEmailDraft } from "@/lib/letters/email-template";
import { usePromptKitDictation } from "@/lib/prompt-kit/use-dictation";
import { useAreaBasePath } from "@/lib/area/use-area-path";
import { createClient } from "@/lib/clients/actions";
import { createLetter, delegateLetterFromWizard, updateLetter } from "@/lib/letters/actions";
import { exportMarkdownPreviewPdf } from "@/lib/letters/export-actions";
import { createMatter } from "@/lib/matters/actions";
import {
  isMarkdownFilename,
  parseMarkdownLetter,
} from "@/lib/letters/parse-markdown";
import type { LetterColleague, LetterKind } from "@/lib/letters/types";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type MatterOption = {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  reference?: string;
};

type ClientOption = {
  id: string;
  name: string;
};

type WizardMode = "main" | "letter" | "email" | "print";

type StepId =
  | "goal"
  | "input"
  | "action"
  | "review"
  | "result"
  | "inserted"
  | "check"
  | "next"
  | "takeover"
  | "workflow"
  | "delegate"
  | "print";

/** Ablauf im Schritt „Ergebnis prüfen“. */
type CheckPhase = "copy" | "ask-errors" | "done";

const NEXT_STEP_OPTIONS: {
  id: string;
  kind: LetterKind;
  title: string;
  description: string;
  defaultTitle: string;
  icon: typeof FileTextIcon;
  /** Schreiben: Prompt→KI→Übernahme; andere: direkt Editor. */
  startsLetterFlow?: boolean;
  startsEmailFlow?: boolean;
  startsPrintFlow?: boolean;
  disabled?: boolean;
}[] = [
  {
    id: "schreiben",
    kind: "schreiben",
    title: "Schreiben erstellen",
    description: "Anwaltsschreiben oder Brief entwerfen.",
    defaultTitle: "Schreiben",
    icon: FileTextIcon,
    startsLetterFlow: true,
  },
  {
    id: "email",
    kind: "email",
    title: "E-Mail senden",
    description: "Kurze E-Mail per KI — mit {{TEXT}} zum Ersetzen in Scrinium.",
    defaultTitle: "Betreff",
    icon: MailIcon,
    startsEmailFlow: true,
  },
  {
    id: "print",
    kind: "schreiben",
    title: "Dokument drucken",
    description:
      "Markdown-Inhalt einfügen — daraus wird ein PDF erzeugt und im Browser geöffnet.",
    defaultTitle: "Dokument",
    icon: PrinterIcon,
    startsPrintFlow: true,
  },
  {
    id: "recherche",
    kind: "recherche",
    title: "Recherche-Vermerk",
    description:
      "Gesetze, Ergebnis und Strategie aus der KI-Prüfung dokumentieren.",
    defaultTitle: "Recherche-Vermerk",
    icon: SearchIcon,
    disabled: true,
  },
  {
    id: "aktennotiz",
    kind: "aktennotiz",
    title: "Aktennotiz",
    description: "Kurze interne Notiz für die Akte.",
    defaultTitle: "Aktennotiz",
    icon: FolderOpenIcon,
    disabled: true,
  },
];

const ALL_STEPS: {
  id: StepId;
  label: string;
  hint: string;
}[] = [
  {
    id: "goal",
    label: "Ziel wählen",
    hint: "Was erreicht werden soll",
  },
  {
    id: "input",
    label: "Text eingeben",
    hint: "Sachverhalt ausführlich beschreiben",
  },
  {
    id: "action",
    label: "Aktion wählen",
    hint: "Was die KI damit tun soll",
  },
  {
    id: "review",
    label: "Prompt prüfen",
    hint: "Lesen und bei Bedarf anpassen",
  },
  {
    id: "result",
    label: "Prompt kopieren",
    hint: "In die KI übernehmen",
  },
  {
    id: "inserted",
    label: "In KI einfügen",
    hint: "Einfügen bestätigen",
  },
  {
    id: "check",
    label: "Ergebnis prüfen",
    hint: "KI-Antwort kritisch nachprüfen lassen",
  },
  {
    id: "next",
    label: "Nächster Schritt",
    hint: "Ergebnis weiterverwenden",
  },
];

const LETTER_STEPS: {
  id: StepId;
  label: string;
  hint: string;
}[] = [
  {
    id: "input",
    label: "Schreiben vorbereiten",
    hint: "Thema und Kernbotschaft",
  },
  {
    id: "result",
    label: "Prompt kopieren",
    hint: "Schreiben erstellen",
  },
  {
    id: "inserted",
    label: "In KI einfügen",
    hint: "Schreiben erstellen",
  },
  {
    id: "takeover",
    label: "Schreiben übernehmen",
    hint: "Text aus der KI in den Editor",
  },
  {
    id: "workflow",
    label: "Weiter mit Schreiben",
    hint: "An Mitarbeiter geben",
  },
  {
    id: "delegate",
    label: "Delegieren",
    hint: "Mitarbeiter und Anweisung",
  },
];

const GOAL_ICONS: Record<PromptKitGoalId, typeof ScaleIcon> = {
  facts: ScaleIcon,
  writing: FilePenLineIcon,
};

const STEP_HEADLINES: Record<StepId, string> = {
  goal: "Ziel wählen",
  input: "Text eingeben",
  action: "Aktion wählen",
  review: "Prompt lesen und prüfen",
  result: "Prompt kopieren",
  inserted: "Prompt in KI einfügen",
  check: "Ergebnis in der KI prüfen",
  next: "Nächsten Schritt wählen",
  takeover: "Schreiben übernehmen",
  workflow: "Wie weiter mit dem Schreiben?",
  delegate: "Delegieren an Mitarbeiter",
  print: "Dokument drucken",
};

/** Schreiben-Folgefluss: Hauptitel + dezenter Kontext in Klammern. */
const LETTER_STEP_HEADLINES: Partial<
  Record<StepId, { title: string; context?: string }>
> = {
  result: { title: "Prompt kopieren", context: "Schreiben erstellen" },
  inserted: {
    title: "Prompt in KI einfügen",
    context: "Schreiben erstellen",
  },
  takeover: { title: "Schreiben übernehmen" },
  workflow: { title: "Wie weiter mit dem Schreiben?" },
  delegate: { title: "Delegieren an Mitarbeiter" },
};

const EMAIL_STEPS: {
  id: StepId;
  label: string;
  hint: string;
}[] = [
  {
    id: "input",
    label: "E-Mail vorbereiten",
    hint: "Adressat und Kernbotschaft",
  },
  {
    id: "result",
    label: "Prompt kopieren",
    hint: "E-Mail erstellen",
  },
  {
    id: "inserted",
    label: "In KI einfügen",
    hint: "E-Mail erstellen",
  },
  {
    id: "takeover",
    label: "E-Mail übernehmen",
    hint: "Text aus der KI in Scrinium",
  },
];

const EMAIL_STEP_HEADLINES: Partial<
  Record<StepId, { title: string; context?: string }>
> = {
  input: { title: "E-Mail vorbereiten", context: "E-Mail senden" },
  result: { title: "Prompt kopieren", context: "E-Mail senden" },
  inserted: { title: "Prompt in KI einfügen", context: "E-Mail senden" },
  takeover: { title: "E-Mail übernehmen" },
};

const PRINT_STEPS: {
  id: StepId;
  label: string;
  hint: string;
}[] = [
  {
    id: "print",
    label: "Dokument drucken",
    hint: "Markdown einfügen und PDF öffnen",
  },
];

const PRINT_STEP_HEADLINES: Partial<
  Record<StepId, { title: string; context?: string }>
> = {
  print: { title: "Dokument drucken" },
};

const WORKFLOW_OPTIONS: {
  id: "edit" | "delegate";
  title: string;
  description: string;
  icon: typeof FilePenLineIcon;
  enabled?: boolean;
}[] = [
  {
    id: "delegate",
    title: "Delegieren an Mitarbeiter",
    description: "An eine Person in der Kanzlei zur Bearbeitung oder Prüfung geben.",
    icon: UserRoundIcon,
  },
  {
    id: "edit",
    title: "Schreiben bearbeiten",
    description: "Schreiben im Editor öffnen und selbst weiterarbeiten.",
    icon: FilePenLineIcon,
    enabled: false,
  },
];

const PROMPT_STEPS: StepId[] = [
  "review",
  "result",
  "inserted",
  "check",
  "next",
  "takeover",
  "workflow",
  "delegate",
];

function stepsForGoal(goal: ReturnType<typeof getPromptKitGoal>) {
  // Eigenständige Funktion „Sachverhalt verarbeiten“ — ohne Zielwahl
  let steps = ALL_STEPS.filter((entry) => entry.id !== "goal");
  if (goal && goal.actions.length <= 1) {
    steps = steps.filter((entry) => entry.id !== "action");
  }
  return steps;
}

export type PromptKitInitialFlow = "letter" | "email" | "print";

export function PromptKitView({
  currentUserId,
  colleagues,
  clients,
  matters: initialMatters,
  initialFlow = null,
}: {
  currentUserId: string;
  colleagues: LetterColleague[];
  clients: ClientOption[];
  matters: MatterOption[];
  /** Direkt aus Schreibtisch / Deep-Link starten. */
  initialFlow?: PromptKitInitialFlow | null;
}) {
  const router = useRouter();
  const basePath = useAreaBasePath() ?? "";
  const [mode, setMode] = useState<WizardMode>(() => {
    if (initialFlow === "letter") return "letter";
    if (initialFlow === "email") return "email";
    if (initialFlow === "print") return "print";
    return "main";
  });
  const [step, setStep] = useState<StepId>(() =>
    initialFlow === "print" ? "print" : "input"
  );
  const [goalId, setGoalId] = useState<PromptKitGoalId | null>("facts");
  const [input, setInput] = useState("");
  const [letterInput, setLetterInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [letterTakeover, setLetterTakeover] = useState("");
  const [printMarkdown, setPrintMarkdown] = useState("");
  const [savedLetterId, setSavedLetterId] = useState<string | null>(null);
  const [isSavingDraft, startSaveDraft] = useTransition();
  const [delegateAssignee, setDelegateAssignee] = useState("");
  const [delegateClientId, setDelegateClientId] = useState("");
  const [delegateClientQuery, setDelegateClientQuery] = useState("");
  const [delegateClientOpen, setDelegateClientOpen] = useState(false);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>(clients);
  const [clientCreateDialogOpen, setClientCreateDialogOpen] = useState(false);
  const [pendingClientName, setPendingClientName] = useState("");
  const [isCreatingClient, startCreateClient] = useTransition();
  const [delegateMatterId, setDelegateMatterId] = useState("");
  const [delegateNote, setDelegateNote] = useState("");
  const [matters, setMatters] = useState<MatterOption[]>(initialMatters);
  const [matterDialogOpen, setMatterDialogOpen] = useState(false);
  const [newMatterTitle, setNewMatterTitle] = useState("");
  const [newMatterReference, setNewMatterReference] = useState("");
  const [isCreatingMatter, startCreateMatter] = useTransition();
  const [isGeneratingPdf, startGeneratePdf] = useTransition();
  const [actionId, setActionId] = useState<string | null>(() => {
    if (initialFlow === "letter") return PROMPT_KIT_CLIENT_LETTER.action.id;
    if (initialFlow === "email") return PROMPT_KIT_EMAIL.action.id;
    return null;
  });
  const [draftPrompt, setDraftPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [checkCopied, setCheckCopied] = useState(false);
  const [checkPhase, setCheckPhase] = useState<CheckPhase>("copy");
  /** Wie oft die Fehler-Frage schon beantwortet wurde (0 = erster Durchgang). */
  const [checkAskCount, setCheckAskCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const draftPromptRef = useRef<HTMLTextAreaElement>(null);
  const takeoverRef = useRef<HTMLTextAreaElement>(null);
  const mdTakeoverInputRef = useRef<HTMLInputElement>(null);
  const mdPrintInputRef = useRef<HTMLInputElement>(null);
  const txtTakeoverInputRef = useRef<HTMLInputElement>(null);
  const delegateClientIdRef = useRef("");
  delegateClientIdRef.current = delegateClientId;

  const {
    listening,
    blocks,
    hasSession,
    sessionText,
    startListening,
    stopListening,
    discardSession,
    addSection,
  } = usePromptKitDictation();

  const {
    listening: noteListening,
    blocks: noteBlocks,
    hasSession: noteHasSession,
    sessionText: noteSessionText,
    startListening: startNoteListening,
    stopListening: stopNoteListening,
    discardSession: discardNoteSession,
  } = usePromptKitDictation();

  const goal = goalId ? getPromptKitGoal(goalId) : null;
  const letterMode = mode === "letter";
  const emailMode = mode === "email";
  const printMode = mode === "print";
  const followUpMode = letterMode || emailMode;
  const activeInput = letterMode
    ? letterInput
    : emailMode
      ? emailInput
      : input;
  const setActiveInput = letterMode
    ? setLetterInput
    : emailMode
      ? setEmailInput
      : setInput;
  const letterAction = PROMPT_KIT_CLIENT_LETTER.action;
  const emailAction = PROMPT_KIT_EMAIL.action;
  const steps = printMode
    ? PRINT_STEPS
    : letterMode
    ? LETTER_STEPS
    : emailMode
      ? EMAIL_STEPS
      : stepsForGoal(goal);
  const singleAction = goal?.actions.length === 1 ? goal.actions[0] : null;
  const action = letterMode
    ? letterAction
    : emailMode
      ? emailAction
      : goal && actionId
        ? (goal.actions.find((entry) => entry.id === actionId) ?? null)
        : singleAction && PROMPT_STEPS.includes(step)
          ? singleAction
          : null;

  const stepIndex = steps.findIndex((entry) => entry.id === step);

  const stepSummaries: Record<StepId, string | null> = {
    goal: goal?.title ?? null,
    input: activeInput.trim()
      ? `${activeInput.trim().slice(0, 80)}${activeInput.trim().length > 80 ? "…" : ""}`
      : null,
    action: action?.title ?? singleAction?.title ?? null,
    review: draftPrompt.trim()
      ? step === "review"
        ? "Bearbeiten"
        : "Geprüft"
      : null,
    result:
      step === "result"
        ? copied
          ? "Kopiert"
          : "Bereit"
        : step === "inserted" ||
            step === "check" ||
            step === "next" ||
            step === "takeover" ||
            step === "workflow" ||
            step === "delegate"
          ? "Kopiert"
          : null,
    inserted:
      step === "inserted"
        ? null
        : step === "check" ||
            step === "next" ||
            step === "takeover" ||
            step === "workflow" ||
            step === "delegate"
          ? "Ja"
          : null,
    check:
      step === "check"
        ? checkCopied
          ? "Kopiert"
          : "Bereit"
        : step === "next"
          ? "Fertig"
          : null,
    next: null,
    takeover: letterTakeover.trim()
      ? step === "takeover"
        ? "Einfügen"
        : "Bereit"
      : null,
    workflow: step === "delegate" ? "Delegieren" : null,
    delegate: null,
    print: printMarkdown.trim()
      ? step === "print"
        ? "Einfügen"
        : "Bereit"
      : null,
  };

  const delegateMatters = delegateClientId
    ? matters.filter((matter) => matter.clientId === delegateClientId)
    : [];
  const delegateCandidates = colleagues.filter(
    (person) => person.id !== currentUserId
  );
  const filteredDelegateClients = clientOptions.filter((client) => {
    const query = delegateClientQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return client.name.toLowerCase().includes(query);
  });
  const selectedDelegateClient = clientOptions.find(
    (client) => client.id === delegateClientId
  );

  const builtOutput = useMemo(() => {
    const activeAction =
      action ??
      (letterMode
        ? letterAction
        : emailMode
          ? emailAction
          : PROMPT_STEPS.includes(step)
            ? singleAction
            : null);
    if (!activeAction) {
      return "";
    }
    if (emailMode) {
      if (!emailInput.trim()) {
        return "";
      }
      return buildPromptKitEmailOutput(
        activeAction.template,
        emailInput,
        input
      );
    }
    if (!activeInput.trim()) {
      return "";
    }
    return buildPromptKitOutput(activeAction.template, activeInput);
  }, [
    action,
    activeInput,
    emailAction,
    emailInput,
    emailMode,
    input,
    letterAction,
    letterMode,
    singleAction,
    step,
  ]);

  useLayoutEffect(() => {
    const el =
      step === "review"
        ? draftPromptRef.current
        : step === "takeover"
          ? takeoverRef.current
          : step === "input" && !hasSession
            ? textareaRef.current
            : step === "delegate" && !noteHasSession
              ? noteTextareaRef.current
              : null;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [
    draftPrompt,
    hasSession,
    noteHasSession,
    activeInput,
    delegateNote,
    letterTakeover,
    step,
  ]);

  function clearCopyFlow() {
    setCopied(false);
    setCheckCopied(false);
    setCheckPhase("copy");
    setCheckAskCount(0);
  }

  function resetCheckFlow() {
    setCheckCopied(false);
    setCheckPhase("copy");
    setCheckAskCount(0);
  }

  function openReview(nextAction: PromptKitAction, nextInput: string) {
    setActionId(nextAction.id);
    setDraftPrompt(buildPromptKitOutput(nextAction.template, nextInput));
    clearCopyFlow();
    setStep("review");
  }

  function openLetterCopy(nextInput: string) {
    setActionId(letterAction.id);
    setDraftPrompt(buildPromptKitOutput(letterAction.template, nextInput));
    clearCopyFlow();
    setStep("result");
  }

  function openEmailCopy(briefing: string) {
    setActionId(emailAction.id);
    setDraftPrompt(buildPromptKitEmailOutput(emailAction.template, briefing, input));
    clearCopyFlow();
    setStep("result");
  }

  function focusComposer(nextValue?: string) {
    const tryFocus = (attempt: number) => {
      const el = textareaRef.current;
      if (!el) {
        if (attempt < 8) {
          requestAnimationFrame(() => tryFocus(attempt + 1));
        }
        return;
      }
      el.focus();
      const len = (nextValue ?? el.value).length;
      el.setSelectionRange(len, len);
    };
    requestAnimationFrame(() => tryFocus(0));
  }

  function selectGoal(id: PromptKitGoalId) {
    discardSession();
    setMode("main");
    setGoalId(id);
    setActionId(null);
    setDraftPrompt("");
    setLetterInput("");
    setEmailInput("");
    setLetterTakeover("");
    setSavedLetterId(null);
    clearCopyFlow();
    setStep("input");
  }

  function startLetterFlow() {
    discardSession();
    setMode("letter");
    setLetterInput("");
    setEmailInput("");
    setLetterTakeover("");
    setSavedLetterId(null);
    setActionId(letterAction.id);
    setDraftPrompt("");
    clearCopyFlow();
    setStep("input");
  }

  function startEmailFlow(options?: { requireFacts?: boolean }) {
    if (options?.requireFacts !== false && !input.trim()) {
      toast.error("Sachverhalt fehlt — bitte zuerst einen Sachverhalt erfassen.");
      return;
    }
    discardSession();
    setMode("email");
    setEmailInput("");
    setLetterTakeover("");
    setPrintMarkdown("");
    setSavedLetterId(null);
    setActionId(emailAction.id);
    setDraftPrompt("");
    clearCopyFlow();
    setStep("input");
  }

  function startPrintFlow() {
    discardSession();
    setMode("print");
    setPrintMarkdown("");
    clearCopyFlow();
    setStep("print");
  }

  function exitPrintFlow() {
    setMode("main");
    setPrintMarkdown("");
    setStep("next");
  }

  function exitFollowUpFlow() {
    discardSession();
    setMode("main");
    setLetterInput("");
    setEmailInput("");
    setLetterTakeover("");
    setSavedLetterId(null);
    setDraftPrompt("");
    clearCopyFlow();
    setStep("next");
  }

  function exitLetterFlow() {
    exitFollowUpFlow();
  }

  function appendTip(insert: string) {
    if (hasSession) {
      addSection(insert);
      return;
    }
    const nextInput = appendSectionToInput(activeInput, insert);
    setActiveInput(nextInput);
    focusComposer(nextInput);
  }

  function continueFromInput() {
    if (letterMode) {
      const nextInput = hasSession
        ? mergeSessionIntoInput(letterInput, blocks)
        : letterInput;
      if (!nextInput.trim()) {
        return;
      }
      discardSession();
      setLetterInput(nextInput);
      openLetterCopy(nextInput);
      return;
    }
    if (emailMode) {
      const nextInput = hasSession
        ? mergeSessionIntoInput(emailInput, blocks)
        : emailInput;
      if (!nextInput.trim()) {
        return;
      }
      discardSession();
      setEmailInput(nextInput);
      openEmailCopy(nextInput);
      return;
    }
    if (!goal) {
      return;
    }
    const nextInput = hasSession
      ? mergeSessionIntoInput(input, blocks)
      : input;
    if (!nextInput.trim()) {
      return;
    }
    discardSession();
    setInput(nextInput);
    if (goal.actions.length === 1) {
      openReview(goal.actions[0], nextInput);
      return;
    }
    setStep("action");
  }

  function goBack() {
    discardSession();
    discardNoteSession();
    if (printMode) {
      exitPrintFlow();
      return;
    }
    if (emailMode) {
      if (step === "takeover") {
        setStep("inserted");
        return;
      }
      if (step === "inserted") {
        setStep("result");
        return;
      }
      clearCopyFlow();
      if (step === "result") {
        setDraftPrompt("");
        setStep("input");
        return;
      }
      if (step === "input") {
        exitFollowUpFlow();
      }
      return;
    }
    if (letterMode) {
      if (step === "delegate") {
        setStep("workflow");
        return;
      }
      if (step === "workflow") {
        setStep("takeover");
        return;
      }
      if (step === "takeover") {
        setStep("inserted");
        return;
      }
      if (step === "inserted") {
        setStep("result");
        return;
      }
      clearCopyFlow();
      if (step === "result") {
        setDraftPrompt("");
        setStep("input");
        return;
      }
      if (step === "input") {
        exitLetterFlow();
      }
      return;
    }
    if (step === "next") {
      setCheckPhase("ask-errors");
      setStep("check");
      return;
    }
    if (step === "check") {
      resetCheckFlow();
      setStep("inserted");
      return;
    }
    if (step === "inserted") {
      setStep("result");
      return;
    }
    clearCopyFlow();
    if (step === "result") {
      setStep("review");
      return;
    }
    if (step === "review") {
      if (goal && goal.actions.length <= 1) {
        setActionId(null);
        setDraftPrompt("");
        setStep("input");
        return;
      }
      setActionId(null);
      setDraftPrompt("");
      setStep("action");
      return;
    }
    if (step === "action") {
      setStep("input");
      return;
    }
    if (step === "input") {
      // Eigenständige Funktion — kein Zurück zur Zielwahl
      return;
    }
  }

  function jumpToStep(target: StepId) {
    const targetIndex = steps.findIndex((entry) => entry.id === target);
    if (targetIndex < 0 || targetIndex > stepIndex) {
      return;
    }
    discardSession();
    if (emailMode) {
      if (target === "takeover" || target === "inserted") {
        setStep(target);
        return;
      }
      if (
        target === "result" &&
        (step === "takeover" || step === "inserted" || copied)
      ) {
        setStep("result");
        return;
      }
      clearCopyFlow();
      if (target === "input") {
        setDraftPrompt("");
      }
      setStep(target);
      return;
    }
    if (letterMode) {
      if (
        target === "delegate" ||
        target === "workflow" ||
        target === "takeover" ||
        target === "inserted"
      ) {
        setStep(target);
        return;
      }
      if (
        target === "result" &&
        (step === "delegate" ||
          step === "workflow" ||
          step === "takeover" ||
          step === "inserted" ||
          copied)
      ) {
        setStep("result");
        return;
      }
      clearCopyFlow();
      if (target === "input") {
        setDraftPrompt("");
      }
      setStep(target);
      return;
    }
    if (target === "next" || target === "check" || target === "inserted") {
      if (target === "inserted") {
        resetCheckFlow();
      }
      if (target === "check" && step === "next") {
        setCheckPhase("ask-errors");
      }
      setStep(target);
      return;
    }
    if (
      target === "result" &&
      (step === "next" || step === "check" || step === "inserted" || copied)
    ) {
      resetCheckFlow();
      setStep("result");
      return;
    }
    clearCopyFlow();
    if (target === "goal") {
      setGoalId(null);
      setActionId(null);
      setDraftPrompt("");
    }
    if (target === "input" || target === "action") {
      setActionId(null);
      setDraftPrompt("");
    }
    setStep(target);
  }

  function selectAction(next: PromptKitAction) {
    if (!input.trim()) {
      toast.error("Bitte zuerst den Text eingeben.");
      setStep("input");
      return;
    }
    openReview(next, input);
  }

  function rejectDictation() {
    discardSession();
    focusComposer(activeInput);
  }

  function acceptDictation(sessionBlocks: DictationBlock[] = blocks) {
    if (
      !flattenBlocks(sessionBlocks).trim() &&
      sessionBlocks.length === 0
    ) {
      discardSession();
      focusComposer(activeInput);
      return;
    }
    const nextInput = mergeSessionIntoInput(activeInput, sessionBlocks);
    discardSession();
    setActiveInput(nextInput);
    focusComposer(nextInput);
  }

  function handleMicClick() {
    if (listening) {
      const finalized = stopListening();
      acceptDictation(finalized);
      return;
    }
    discardNoteSession();
    startListening();
  }

  function acceptNoteDictation(sessionBlocks: DictationBlock[] = noteBlocks) {
    if (
      !flattenBlocks(sessionBlocks).trim() &&
      sessionBlocks.length === 0
    ) {
      discardNoteSession();
      return;
    }
    setDelegateNote(mergeSessionIntoInput(delegateNote, sessionBlocks));
    discardNoteSession();
  }

  function rejectNoteDictation() {
    discardNoteSession();
  }

  function handleNoteMicClick() {
    if (noteListening) {
      const finalized = stopNoteListening();
      acceptNoteDictation(finalized);
      return;
    }
    discardSession();
    startNoteListening();
  }

  function continueFromReview() {
    if (!draftPrompt.trim()) {
      return;
    }
    clearCopyFlow();
    setStep("result");
  }

  function regenerateDraft() {
    if (!builtOutput) {
      return;
    }
    setDraftPrompt(builtOutput);
    clearCopyFlow();
    toast.success("Prompt aus Vorlage neu erzeugt.");
  }

  async function copyOutput() {
    if (!draftPrompt.trim()) {
      return;
    }
    try {
      await navigator.clipboard.writeText(draftPrompt);
      setCopied(true);
      toast.success("Prompt kopiert. Jetzt in der KI einfügen.");
      setStep("inserted");
    } catch {
      toast.error("Kopieren nicht möglich.");
    }
  }

  async function copyCheckPrompt() {
    try {
      await navigator.clipboard.writeText(PROMPT_KIT_RESULT_CHECK);
      setCheckCopied(true);
      setCheckPhase("ask-errors");
      toast.success("Prompt kopiert. Jetzt in der KI einfügen.");
    } catch {
      toast.error("Kopieren nicht möglich.");
    }
  }

  function confirmPromptInserted() {
    if (followUpMode) {
      setLetterTakeover("");
      setStep("takeover");
      return;
    }
    resetCheckFlow();
    setStep("check");
  }

  function rejectPromptInserted() {
    setStep("result");
  }

  function answerNoErrors(hasNoErrors: boolean) {
    if (hasNoErrors) {
      setCheckPhase("done");
      setStep("next");
      return;
    }
    setCheckAskCount((count) => count + 1);
    setCheckCopied(false);
    setCheckPhase("copy");
  }

  async function pasteLetterTakeover() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.error("Zwischenablage ist leer.");
        return;
      }
      setLetterTakeover(text.trim());
      toast.success("Text eingefügt.");
    } catch {
      toast.error("Zwischenablage nicht lesbar.");
    }
  }

  async function importTextTakeover(file: File) {
    const isTxt =
      /\.txt$/i.test(file.name.trim()) ||
      file.type === "text/plain" ||
      file.type === "";
    if (!isTxt) {
      toast.error("Bitte eine .txt-Datei wählen.");
      return;
    }
    try {
      const text = await file.text();
      if (!text.trim()) {
        toast.error("Datei ist leer.");
        return;
      }
      setLetterTakeover(text.trim());
      toast.success("Textdatei übernommen.");
    } catch {
      toast.error("Datei konnte nicht gelesen werden.");
    }
  }

  async function importMarkdownTakeover(file: File) {
    if (!isMarkdownFilename(file.name) && file.type !== "text/markdown") {
      toast.error("Bitte eine .md-Datei wählen.");
      return;
    }
    try {
      const text = await file.text();
      if (!text.trim()) {
        toast.error("Datei ist leer.");
        return;
      }
      setLetterTakeover(text.trim());
      toast.success("Markdown-Datei übernommen.");
    } catch {
      toast.error("Datei konnte nicht gelesen werden.");
    }
  }

  async function importMarkdownPrint(file: File) {
    if (!isMarkdownFilename(file.name) && file.type !== "text/markdown") {
      toast.error("Bitte eine .md-Datei wählen.");
      return;
    }
    try {
      const text = await file.text();
      if (!text.trim()) {
        toast.error("Datei ist leer.");
        return;
      }
      setPrintMarkdown(text.trim());
      toast.success("Markdown-Datei übernommen.");
    } catch {
      toast.error("Datei konnte nicht gelesen werden.");
    }
  }

  async function pastePrintMarkdown() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.error("Zwischenablage ist leer.");
        return;
      }
      setPrintMarkdown(text.trim());
      toast.success("Aus Zwischenablage übernommen.");
    } catch {
      toast.error("Zwischenablage konnte nicht gelesen werden.");
    }
  }

  function openPrintPdf() {
    const text = printMarkdown.trim();
    if (!text) {
      toast.error("Bitte Markdown-Inhalt einfügen.");
      return;
    }

    const popup = window.open("", "_blank");
    if (!popup) {
      toast.error("Pop-up blockiert — bitte Pop-ups für diese Seite erlauben.");
      return;
    }

    startGeneratePdf(async () => {
      const result = await exportMarkdownPreviewPdf(text);
      if (!result.success) {
        popup.close();
        toast.error(result.error);
        return;
      }

      const bytes = Uint8Array.from(atob(result.base64), (character) =>
        character.charCodeAt(0)
      );
      const blob = new Blob([bytes], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      popup.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success("PDF geöffnet.");
    });
  }

  function downloadTakeoverAsFile() {
    const text = letterTakeover.trim();
    if (!text) {
      return;
    }
    const isMd = emailMode || letterMode;
    const blob = new Blob([text], {
      type: isMd ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = emailMode
      ? "email-entwurf.md"
      : letterMode
        ? "schreiben-entwurf.md"
        : "entwurf.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(isMd ? "Als .md gespeichert." : "Als .txt gespeichert.");
  }

  function openLetterEditor() {
    if (!savedLetterId) {
      toast.error("Entwurf fehlt — bitte zuerst Schreiben übernehmen.");
      return;
    }
    router.push(`${basePath}/schreiben/${savedLetterId}/bearbeiten`);
  }

  function openDelegateStep() {
    if (!savedLetterId) {
      toast.error("Entwurf fehlt — bitte zuerst Schreiben übernehmen.");
      return;
    }
    const defaultAssignee =
      delegateCandidates[0]?.id ??
      colleagues.find((person) => person.id !== currentUserId)?.id ??
      "";
    setDelegateAssignee(defaultAssignee);
    setDelegateClientId("");
    setDelegateClientQuery("");
    setDelegateClientOpen(false);
    setClientCreateDialogOpen(false);
    setPendingClientName("");
    setDelegateMatterId("");
    setDelegateNote("");
    setMatterDialogOpen(false);
    setNewMatterTitle("");
    setNewMatterReference("");
    discardNoteSession();
    setStep("delegate");
  }

  function findExactDelegateClient(name: string) {
    const normalized = name.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    return (
      clientOptions.find(
        (client) => client.name.toLowerCase() === normalized
      ) ?? null
    );
  }

  function handleDelegateClientBlur(event: React.FocusEvent<HTMLInputElement>) {
    const queryOnBlur = event.target.value.trim();
    window.setTimeout(() => {
      setDelegateClientOpen(false);

      if (delegateClientIdRef.current) {
        setDelegateClientQuery("");
        return;
      }

      if (!queryOnBlur) {
        return;
      }

      const exactMatch = findExactDelegateClient(queryOnBlur);
      if (exactMatch) {
        setDelegateClientId(exactMatch.id);
        setDelegateClientQuery("");
        setDelegateMatterId("");
        return;
      }

      setPendingClientName(queryOnBlur);
      setClientCreateDialogOpen(true);
    }, 120);
  }

  function createDelegateClient() {
    const name = pendingClientName.trim();
    if (!name) {
      setClientCreateDialogOpen(false);
      return;
    }

    startCreateClient(async () => {
      const result = await createClient({
        kind: "company",
        name,
        salutation: "",
        firstName: "",
        lastName: "",
        street: "",
        postalCode: "",
        city: "",
        country: "Deutschland",
        email: "",
        phone: "",
        mobile: "",
        notes: "",
        module: "legal",
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const option: ClientOption = {
        id: result.item.id,
        name: result.item.name,
      };
      setClientOptions((prev) =>
        [...prev, option].sort((a, b) => a.name.localeCompare(b.name, "de"))
      );
      setDelegateClientId(result.item.id);
      setDelegateClientQuery("");
      setDelegateMatterId("");
      setClientCreateDialogOpen(false);
      setPendingClientName("");
      toast.success("Mandant angelegt.");
    });
  }

  function createMatterFromDialog() {
    if (!delegateClientId) {
      toast.error("Bitte zuerst einen Mandanten wählen.");
      return;
    }
    if (!newMatterTitle.trim()) {
      toast.error("Bitte einen Aktentitel angeben.");
      return;
    }

    startCreateMatter(async () => {
      const result = await createMatter({
        clientId: delegateClientId,
        title: newMatterTitle,
        reference: newMatterReference,
        notes: "",
        module: "legal",
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const clientName =
        clientOptions.find((client) => client.id === delegateClientId)?.name ??
        result.item.clientName;
      const option: MatterOption = {
        id: result.item.id,
        title: result.item.title,
        clientId: result.item.clientId,
        clientName,
        reference: result.item.reference,
      };
      setMatters((prev) =>
        [...prev, option].sort((a, b) =>
          `${a.clientName} ${a.title}`.localeCompare(
            `${b.clientName} ${b.title}`,
            "de"
          )
        )
      );
      setDelegateMatterId(result.item.id);
      setMatterDialogOpen(false);
      setNewMatterTitle("");
      setNewMatterReference("");
      toast.success("Akte angelegt.");
    });
  }

  function submitDelegation() {
    if (!savedLetterId) {
      toast.error("Entwurf fehlt.");
      return;
    }
    if (!delegateAssignee.trim()) {
      toast.error("Bitte einen Mitarbeiter wählen.");
      return;
    }

    const noteToSend = noteHasSession
      ? mergeSessionIntoInput(delegateNote, noteBlocks)
      : delegateNote;
    if (noteHasSession) {
      discardNoteSession();
      setDelegateNote(noteToSend);
    }

    startSaveDraft(async () => {
      const result = await delegateLetterFromWizard({
        letterId: savedLetterId,
        assignedTo: delegateAssignee,
        matterId: delegateMatterId || null,
        assignmentNote: noteToSend,
        intent: "bearbeiten",
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Schreiben delegiert.");
      router.push(`${basePath}/eingang`);
    });
  }

  function continueFromTakeover() {
    const raw = letterTakeover.trim();
    if (!raw) {
      toast.error("Bitte zuerst den Text aus der KI einfügen.");
      return;
    }

    const parsed = emailMode ? parseEmailDraft(raw) : parseMarkdownLetter(raw);
    const title = emailMode
      ? (parsed.subject.trim() || "Betreff")
      : (extractThemaTitle(letterInput) ?? "Schreiben");
    const kind: LetterKind = emailMode ? "email" : "schreiben";
    const letterInputPayload = {
      title,
      kind,
      subject: parsed.subject,
      salutation: parsed.salutation,
      body: parsed.body || raw,
      closing: parsed.closing,
      module: "legal" as const,
    };

    startSaveDraft(async () => {
      let letterId = savedLetterId;
      if (letterId) {
        const result = await updateLetter(letterId, letterInputPayload);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
      } else {
        const result = await createLetter(letterInputPayload);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        letterId = result.item.id;
        setSavedLetterId(result.item.id);
      }
      toast.success(
        emailMode
          ? "E-Mail-Entwurf gespeichert — {{TEXT}} ersetzen und versenden."
          : "Entwurf gespeichert."
      );
      if (emailMode && letterId) {
        router.push(`${basePath}/schreiben/${letterId}/bearbeiten`);
        return;
      }
      setStep("workflow");
    });
  }

  const resultAction =
    action ??
    (followUpMode
      ? letterMode
        ? letterAction
        : emailAction
      : PROMPT_STEPS.includes(step)
        ? singleAction
        : null);
  const canAcceptSession =
    Boolean(sessionText.trim()) ||
    blocks.some((block) => block.type === "section");
  const inputConfig = letterMode
    ? {
        inputHeadline: PROMPT_KIT_CLIENT_LETTER.inputHeadline,
        guide: PROMPT_KIT_CLIENT_LETTER.guide,
        inputLabel: PROMPT_KIT_CLIENT_LETTER.inputLabel,
        inputPlaceholder: PROMPT_KIT_CLIENT_LETTER.inputPlaceholder,
        inputTips: [...PROMPT_KIT_CLIENT_LETTER.inputTips],
        singleActionNext: true,
      }
    : emailMode
      ? {
          inputHeadline: PROMPT_KIT_EMAIL.inputHeadline,
          guide: PROMPT_KIT_EMAIL.guide,
          inputLabel: PROMPT_KIT_EMAIL.inputLabel,
          inputPlaceholder: PROMPT_KIT_EMAIL.inputPlaceholder,
          inputTips: [...PROMPT_KIT_EMAIL.inputTips],
          singleActionNext: true,
        }
      : goal
      ? {
          inputHeadline: goal.inputHeadline,
          guide: goal.guide,
          inputLabel: goal.inputLabel,
          inputPlaceholder: goal.inputPlaceholder,
          inputTips: goal.inputTips,
          singleActionNext: goal.actions.length <= 1,
        }
      : null;

  return (
    <div className="-mx-4 -my-8 flex min-h-[calc(100vh-4rem)] flex-1 flex-col overflow-x-hidden md:-mx-8 md:-my-10">
      <div className="grid min-h-0 flex-1 border-t border-border/60 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)]">
        <div className="min-h-0 min-w-0 overflow-y-auto px-4 py-8 md:px-8 md:py-10">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
            <header className="space-y-2">
              <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase lg:hidden">
                Schritt {stepIndex + 1} von {steps.length}
              </p>
              <h1 className="font-heading text-3xl font-medium tracking-tight md:text-4xl">
                {step === "input" && inputConfig ? (
                  inputConfig.inputHeadline
                ) : letterMode && LETTER_STEP_HEADLINES[step] ? (
                  <>
                    {LETTER_STEP_HEADLINES[step]!.title}
                    {LETTER_STEP_HEADLINES[step]!.context ? (
                      <>
                        {" "}
                        <span className="text-[0.72em] font-normal tracking-normal text-muted-foreground/65">
                          ({LETTER_STEP_HEADLINES[step]!.context})
                        </span>
                      </>
                    ) : null}
                  </>
                ) : emailMode && EMAIL_STEP_HEADLINES[step] ? (
                  <>
                    {EMAIL_STEP_HEADLINES[step]!.title}
                    {EMAIL_STEP_HEADLINES[step]!.context ? (
                      <>
                        {" "}
                        <span className="text-[0.72em] font-normal tracking-normal text-muted-foreground/65">
                          ({EMAIL_STEP_HEADLINES[step]!.context})
                        </span>
                      </>
                    ) : null}
                  </>
                ) : printMode && PRINT_STEP_HEADLINES[step] ? (
                  PRINT_STEP_HEADLINES[step]!.title
                ) : (
                  STEP_HEADLINES[step]
                )}
              </h1>
              {step === "input" && inputConfig ? (
                <p className="text-sm text-muted-foreground md:text-base md:leading-relaxed">
                  {inputConfig.guide}
                </p>
              ) : step === "goal" ? (
                <p className="text-sm text-muted-foreground md:text-base">
                  Eine Karte wählen — danach Schritt für Schritt weiter.
                </p>
              ) : step === "action" && goal ? (
                <p className="text-sm text-muted-foreground md:text-base">
                  Passende Aktion für „{goal.title}“ wählen.
                </p>
              ) : step === "review" && resultAction ? (
                <p className="text-sm text-muted-foreground md:text-base md:leading-relaxed">
                  Den ganzen Prompt durchlesen und Stellen anpassen, die nicht
                  passen — z. B. Paragraphen oder Gesetzbücher ergänzen.
                </p>
              ) : step === "result" && resultAction ? (
                <p className="text-sm text-muted-foreground md:text-base">
                  {letterMode
                    ? "Prompt in die Zwischenablage kopieren und in der KI einfügen — dort das Schreiben erstellen."
                    : emailMode
                      ? "Prompt in die Zwischenablage kopieren und in der KI einfügen — dort die E-Mail als .md-Datei mit {{TEXT}} erstellen."
                      : goal?.id === "facts"
                        ? "Prompt in die Zwischenablage kopieren und anschließend in der KI einfügen — dort den Sachverhalt mit der KI verarbeiten."
                        : "Prompt in die Zwischenablage kopieren und anschließend in der KI einfügen — dort den Text mit der KI erstellen."}
                </p>
              ) : step === "inserted" ? (
                <p className="text-sm text-muted-foreground md:text-base md:leading-relaxed">
                  {letterMode
                    ? "Den Prompt jetzt in der KI einfügen, damit das Schreiben erstellt wird. Danach mit Ja bestätigen — oder mit Nein zurück zum Kopieren, falls es noch nicht geklappt hat."
                    : emailMode
                      ? "Den Prompt jetzt in der KI einfügen, damit die E-Mail erstellt wird. Danach mit Ja bestätigen — oder mit Nein zurück zum Kopieren."
                      : "Den kopierten Prompt jetzt in der KI einfügen. Danach mit Ja bestätigen — oder mit Nein zurück zum Kopieren, falls es noch nicht geklappt hat."}
                </p>
              ) : step === "check" ? (
                <p className="text-sm text-muted-foreground md:text-base">
                  Ergebnis mit diesem Prompt prüfen und bei Bedarf wiederholen.
                </p>
              ) : step === "next" ? (
                <p className="text-sm text-muted-foreground md:text-base">
                  Ergebnis der KI weiterverwenden — Art des Entwurfs festlegen.
                </p>
              ) : step === "print" ? (
                <p className="text-sm text-muted-foreground md:text-base md:leading-relaxed">
                  Markdown aus der KI einfügen oder als .md laden — daraus wird ein
                  PDF erzeugt und in einem neuen Browser-Tab geöffnet.
                </p>
              ) : step === "takeover" ? (
                <p className="text-sm text-muted-foreground md:text-base md:leading-relaxed">
                  {emailMode
                    ? "E-Mail-Text aus der KI einfügen — per Zwischenablage oder .md-Datei. Mit Weiter öffnet sich der Editor: dort {{TEXT}} ersetzen, Empfänger eintragen und versenden."
                    : "Die .md-Datei aus der KI hier laden oder den Text einfügen. Mit Weiter wird ein Entwurf gespeichert — danach an einen Mitarbeiter delegieren."}
                </p>
              ) : step === "workflow" ? (
                <p className="text-sm text-muted-foreground md:text-base">
                  Als Nächstes an einen Mitarbeiter zur Bearbeitung geben.
                </p>
              ) : step === "delegate" ? (
                <p className="text-sm text-muted-foreground md:text-base md:leading-relaxed">
                  Mitarbeiter wählen, optional Mandant und Akte zuordnen und eine
                  Anweisung für den nächsten Bearbeitungsschritt hinterlassen.
                </p>
              ) : null}
            </header>

            {step === "goal" ? (
              <section className="grid gap-3 sm:grid-cols-2">
                {PROMPT_KIT_GOALS.map((entry) => {
                  const Icon = GOAL_ICONS[entry.id];
                  const enabled = entry.enabled !== false;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      disabled={!enabled}
                      onClick={() => {
                        if (!enabled) {
                          return;
                        }
                        selectGoal(entry.id);
                      }}
                      aria-disabled={!enabled}
                      className={cn(
                        "group surface-card flex flex-col gap-4 p-6 text-left transition-colors",
                        enabled
                          ? "hover:border-foreground/30 hover:bg-muted/25"
                          : "cursor-not-allowed opacity-45"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-11 items-center justify-center border border-border/70 bg-muted/40",
                          enabled &&
                            "transition-colors group-hover:border-foreground/20 group-hover:bg-background"
                        )}
                      >
                        <Icon className="size-5" />
                      </span>
                      <span className="space-y-1.5">
                        <span className="block font-heading text-lg font-medium tracking-tight">
                          {entry.title}
                        </span>
                        <span className="block text-sm leading-relaxed text-muted-foreground">
                          {entry.description}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "mt-auto flex items-center gap-1.5 text-sm font-medium",
                          enabled
                            ? "text-foreground/70"
                            : "text-muted-foreground"
                        )}
                      >
                        {enabled ? (
                          <>
                            Auswählen
                            <ArrowRightIcon className="size-4" />
                          </>
                        ) : (
                          "Demnächst"
                        )}
                      </span>
                    </button>
                  );
                })}
              </section>
            ) : null}

            {step === "input" && inputConfig ? (
              <section className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {inputConfig.inputTips.map((tip) => {
                    const used =
                      sectionIsPresent(activeInput, tip.insert) ||
                      sessionHasSection(blocks, tip.insert);
                    return (
                      <button
                        key={tip.label}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => appendTip(tip.insert)}
                        aria-pressed={used}
                        className={cn(
                          "rounded-full border px-4 py-2.5 text-left text-sm shadow-[var(--shadow-soft)] transition-colors",
                          used
                            ? "border-emerald-500/50 bg-emerald-50 text-emerald-900"
                            : "border-border/70 bg-background/80 text-foreground/80 hover:border-foreground/25 hover:bg-muted/30 hover:text-foreground"
                        )}
                      >
                        {tip.label}
                      </button>
                    );
                  })}
                </div>

                <div
                  className={cn(
                    "flex flex-col gap-4 rounded-3xl border border-border/70 bg-background p-4 shadow-[var(--shadow-elevated)]",
                    "ring-1 ring-foreground/[0.03]",
                    hasSession && "border-foreground/30 ring-foreground/10"
                  )}
                >
                  {hasSession ? (
                    <SessionPreview
                      baseInput={activeInput}
                      blocks={blocks}
                      listening={listening}
                    />
                  ) : (
                    <textarea
                      ref={textareaRef}
                      id="prompt-kit-input"
                      value={activeInput}
                      onChange={(event) => setActiveInput(event.target.value)}
                      placeholder={inputConfig.inputPlaceholder}
                      rows={1}
                      autoFocus
                      className={cn(
                        "min-h-36 w-full resize-none overflow-hidden border-0 bg-transparent",
                        "text-base leading-relaxed outline-none placeholder:text-muted-foreground/70",
                        "focus-visible:ring-0"
                      )}
                      aria-label={inputConfig.inputLabel}
                    />
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
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
                            onClick={rejectDictation}
                            className="h-9 rounded-full px-3.5"
                          >
                            <XIcon data-icon="inline-start" />
                            Verwerfen
                          </Button>
                        </>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {listening ? (
                        <span className="text-xs text-muted-foreground">
                          Hört zu…
                        </span>
                      ) : null}
                      <Button
                        type="button"
                        variant={listening ? "default" : "outline"}
                        size="icon-lg"
                        onClick={handleMicClick}
                        aria-pressed={listening}
                        aria-label={
                          listening ? "Diktieren beenden" : "Diktieren starten"
                        }
                        title={
                          listening ? "Diktieren beenden" : "Diktieren starten"
                        }
                        className={cn(
                          "rounded-full",
                          listening && "animate-pulse"
                        )}
                      >
                        {listening ? (
                          <MicOffIcon className="size-4" />
                        ) : (
                          <MicIcon className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <WizardNav
                  onBack={goBack}
                  showBack={followUpMode}
                  onNext={continueFromInput}
                  nextLabel={
                    inputConfig.singleActionNext
                      ? "Prompt erzeugen"
                      : "Weiter zur Aktion"
                  }
                  nextDisabled={!activeInput.trim() && !sessionText.trim()}
                />
              </section>
            ) : null}

            {step === "action" && goal ? (
              <section className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {goal.actions.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => selectAction(entry)}
                      className={cn(
                        "group surface-card flex flex-col gap-2 p-5 text-left transition-colors",
                        "hover:border-foreground/30 hover:bg-muted/25"
                      )}
                    >
                      <span className="font-heading text-base font-medium tracking-tight">
                        {entry.title}
                      </span>
                      <span className="text-sm leading-relaxed text-muted-foreground">
                        {entry.description}
                      </span>
                      <span className="mt-2 flex items-center gap-1.5 text-sm font-medium text-foreground/70">
                        Prompt erzeugen
                        <ArrowRightIcon className="size-4" />
                      </span>
                    </button>
                  ))}
                </div>
                <WizardNav onBack={goBack} />
              </section>
            ) : null}

            {step === "review" && resultAction ? (
              <section className="space-y-5">
                <label className="sr-only" htmlFor="prompt-kit-draft">
                  Prompt bearbeiten
                </label>
                <textarea
                  id="prompt-kit-draft"
                  ref={draftPromptRef}
                  value={draftPrompt}
                  onChange={(event) => {
                    setDraftPrompt(event.target.value);
                    clearCopyFlow();
                  }}
                  rows={1}
                  className="surface-card field-sizing-content min-h-0 w-full resize-none overflow-hidden rounded-none border border-border/70 bg-background p-5 font-sans text-sm leading-relaxed outline-none focus-visible:border-foreground/40"
                />

                <div className="space-y-3">
                  <WizardNav
                    onBack={goBack}
                    onNext={continueFromReview}
                    nextLabel="Weiter zum Kopieren"
                    nextDisabled={!draftPrompt.trim()}
                  />
                  <div className="flex flex-wrap gap-2">
                    {builtOutput && builtOutput !== draftPrompt ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={regenerateDraft}
                        className="h-11 rounded-none px-4"
                      >
                        <RotateCcwIcon data-icon="inline-start" />
                        Aus Vorlage neu
                      </Button>
                    ) : null}
                    {!letterMode && goal && goal.actions.length > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setActionId(null);
                          setDraftPrompt("");
                          clearCopyFlow();
                          setStep("action");
                        }}
                        className="h-11 rounded-none px-4"
                      >
                        Andere Aktion
                      </Button>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {step === "result" && resultAction ? (
              <section className="space-y-5">
                <div className="surface-card space-y-6 p-6 md:p-8">
                  <Button
                    type="button"
                    onClick={copyOutput}
                    className="h-14 w-full rounded-none px-6 text-base font-medium md:text-lg"
                  >
                    <CopyIcon data-icon="inline-start" className="size-5" />
                    {copied
                      ? "Erneut kopieren"
                      : "Prompt kopieren"}
                  </Button>

                  <div className="max-h-56 overflow-y-auto rounded-sm border border-border/50 bg-muted/30">
                    <pre className="p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground/80">
                      {draftPrompt}
                    </pre>
                  </div>
                </div>

                <WizardNav onBack={goBack} />
              </section>
            ) : null}

            {step === "inserted" ? (
              <section className="space-y-5">
                <div className="surface-card space-y-6 p-6 md:p-8">
                  <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                    <CheckIcon className="size-4 shrink-0" />
                    Prompt ist in der Zwischenablage.
                  </p>
                  <div className="space-y-4">
                    <p className="font-heading text-lg font-medium tracking-tight">
                      {letterMode
                        ? "Prompt in der KI eingefügt — Schreiben bereits erstellt?"
                        : emailMode
                          ? "Prompt in der KI eingefügt — E-Mail bereits erstellt?"
                          : "Prompt in der KI erfolgreich eingefügt?"}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        onClick={confirmPromptInserted}
                        className="h-12 w-full rounded-none px-5 text-base"
                      >
                        Ja
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={rejectPromptInserted}
                        className="h-12 w-full rounded-none px-5 text-base"
                      >
                        Nein
                      </Button>
                    </div>
                  </div>
                </div>

                <WizardNav onBack={goBack} />
              </section>
            ) : null}

            {step === "check" ? (
              <section className="space-y-5">
                <div className="surface-card space-y-6 p-6 md:p-8">
                  {checkPhase === "ask-errors" ? (
                    <>
                      <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                        <CheckIcon className="size-4 shrink-0" />
                        Prompt ist in der Zwischenablage.
                      </p>
                      <div className="space-y-4">
                        <p className="font-heading text-lg font-medium tracking-tight">
                          Ergebnis der KI hat keine Fehler mehr?
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            onClick={() => answerNoErrors(true)}
                            className="h-12 w-full rounded-none px-5 text-base"
                          >
                            Weiter
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => answerNoErrors(false)}
                            className="h-12 w-full rounded-none px-5 text-base"
                          >
                            Nochmal prüfen
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {checkAskCount > 0 ? (
                        <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                          <span className="font-medium text-foreground">
                            Hinweis:
                          </span>{" "}
                          Vorgang nochmal wiederholen — Prompt erneut in der KI
                          einfügen, bis das Ergebnis bestätigt ist.
                        </p>
                      ) : null}
                      <Button
                        type="button"
                        onClick={copyCheckPrompt}
                        className="h-14 w-full rounded-none px-6 text-base font-medium md:text-lg"
                      >
                        <CopyIcon
                          data-icon="inline-start"
                          className="size-5"
                        />
                        {checkAskCount > 0
                          ? "Erneut kopieren"
                          : "Prompt kopieren"}
                      </Button>
                      <div className="max-h-56 overflow-y-auto rounded-sm border border-border/50 bg-muted/30">
                        <pre className="p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground/80">
                          {PROMPT_KIT_RESULT_CHECK}
                        </pre>
                      </div>
                    </>
                  )}
                </div>

                <WizardNav onBack={goBack} />
              </section>
            ) : null}

            {step === "next" ? (
              <section className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {NEXT_STEP_OPTIONS.map((entry) => {
                    const Icon = entry.icon;
                    const disabled = Boolean(entry.disabled);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (disabled) {
                            return;
                          }
                          if (entry.startsLetterFlow) {
                            startLetterFlow();
                            return;
                          }
                          if (entry.startsEmailFlow) {
                            startEmailFlow();
                            return;
                          }
                          if (entry.startsPrintFlow) {
                            startPrintFlow();
                            return;
                          }
                          const params = new URLSearchParams({
                            kind: entry.kind,
                            title: entry.defaultTitle,
                          });
                          router.push(
                            `${basePath}/schreiben/neu?${params.toString()}`
                          );
                        }}
                        className={cn(
                          "group surface-card flex flex-col gap-4 p-6 text-left transition-colors",
                          disabled
                            ? "cursor-not-allowed opacity-50"
                            : "hover:border-foreground/30 hover:bg-muted/25"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-11 items-center justify-center border border-border/70 bg-muted/40",
                            !disabled &&
                              "transition-colors group-hover:border-foreground/20 group-hover:bg-background"
                          )}
                        >
                          <Icon className="size-5" />
                        </span>
                        <span className="space-y-1.5">
                          <span className="block font-heading text-lg font-medium tracking-tight">
                            {entry.title}
                          </span>
                          <span className="block text-sm leading-relaxed text-muted-foreground">
                            {entry.description}
                          </span>
                        </span>
                        <span className="mt-auto flex items-center gap-1.5 text-sm font-medium text-foreground/70">
                          {disabled ? "Demnächst" : "Weiter"}
                          {disabled ? null : (
                            <ArrowRightIcon className="size-4" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <WizardNav onBack={goBack} />
              </section>
            ) : null}

            {step === "print" ? (
              <section className="space-y-5">
                <div className="surface-card space-y-5 p-6 md:p-8">
                  <label className="sr-only" htmlFor="prompt-kit-print-md">
                    Markdown für PDF
                  </label>
                  <textarea
                    id="prompt-kit-print-md"
                    value={printMarkdown}
                    onChange={(event) => setPrintMarkdown(event.target.value)}
                    placeholder="Markdown-Inhalt aus der KI hier einfügen…"
                    rows={1}
                    className="min-h-48 w-full resize-none overflow-hidden border-0 bg-transparent text-base leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
                  />
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={mdPrintInputRef}
                      type="file"
                      accept=".md,text/markdown"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) {
                          void importMarkdownPrint(file);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void pastePrintMarkdown()}
                      className="h-11 rounded-none px-4"
                    >
                      <ClipboardPasteIcon data-icon="inline-start" />
                      Aus Zwischenablage
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => mdPrintInputRef.current?.click()}
                      className="h-11 rounded-none px-4"
                    >
                      <FileUpIcon data-icon="inline-start" />
                      .md laden
                    </Button>
                    <Button
                      type="button"
                      disabled={!printMarkdown.trim() || isGeneratingPdf}
                      onClick={openPrintPdf}
                      className="h-11 rounded-none px-4"
                    >
                      <PrinterIcon data-icon="inline-start" />
                      {isGeneratingPdf ? "PDF wird erstellt…" : "PDF öffnen"}
                    </Button>
                  </div>
                </div>

                <WizardNav onBack={goBack} />
              </section>
            ) : null}

            {step === "takeover" ? (
              <section className="space-y-5">
                <div className="surface-card space-y-5 p-6 md:p-8">
                  <label className="sr-only" htmlFor="prompt-kit-takeover">
                    {emailMode ? "E-Mail aus der KI" : "Schreiben aus der KI"}
                  </label>
                  <textarea
                    id="prompt-kit-takeover"
                    ref={takeoverRef}
                    value={letterTakeover}
                    onChange={(event) => setLetterTakeover(event.target.value)}
                    placeholder={
                      emailMode
                        ? "E-Mail-Text oder Inhalt einer .md-Datei aus der KI hier einfügen…"
                        : "Inhalt der .md-Datei oder fertigen Text hier einfügen…"
                    }
                    rows={1}
                    className="min-h-48 w-full resize-none overflow-hidden border-0 bg-transparent text-base leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
                  />
                  <div className="flex flex-wrap gap-2">
                    {!emailMode ? (
                      <input
                        ref={txtTakeoverInputRef}
                        type="file"
                        accept=".txt,text/plain"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) {
                            void importTextTakeover(file);
                          }
                        }}
                      />
                    ) : null}
                    <input
                      ref={mdTakeoverInputRef}
                      type="file"
                      accept=".md,text/markdown"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) {
                          void importMarkdownTakeover(file);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={pasteLetterTakeover}
                      className="h-11 rounded-none px-4"
                    >
                      <ClipboardPasteIcon data-icon="inline-start" />
                      Aus Zwischenablage
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => mdTakeoverInputRef.current?.click()}
                      className="h-11 rounded-none px-4"
                    >
                      <FileUpIcon data-icon="inline-start" />
                      .md laden
                    </Button>
                    {!emailMode ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => txtTakeoverInputRef.current?.click()}
                        className="h-11 rounded-none px-4"
                      >
                        <FileUpIcon data-icon="inline-start" />
                        .txt laden
                      </Button>
                    ) : null}
                    {letterTakeover.trim() ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={downloadTakeoverAsFile}
                        className="h-11 rounded-none px-4"
                      >
                        <DownloadIcon data-icon="inline-start" />
                        {emailMode || letterMode ? "Als .md speichern" : "Als .txt speichern"}
                      </Button>
                    ) : null}
                  </div>
                </div>

                <WizardNav
                  onBack={goBack}
                  onNext={continueFromTakeover}
                  nextLabel={
                    isSavingDraft
                      ? "Speichern…"
                      : emailMode
                        ? "Im Editor öffnen"
                        : "Weiter"
                  }
                  nextDisabled={!letterTakeover.trim() || isSavingDraft}
                />
              </section>
            ) : null}

            {step === "workflow" ? (
              <section className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {WORKFLOW_OPTIONS.map((entry) => {
                    const Icon = entry.icon;
                    const enabled = entry.enabled !== false;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        disabled={!enabled}
                        onClick={() => {
                          if (!enabled) {
                            return;
                          }
                          if (entry.id === "delegate") {
                            openDelegateStep();
                            return;
                          }
                          openLetterEditor();
                        }}
                        aria-disabled={!enabled}
                        className={cn(
                          "group surface-card flex flex-col gap-4 p-6 text-left transition-colors",
                          enabled
                            ? "hover:border-foreground/30 hover:bg-muted/25"
                            : "cursor-not-allowed opacity-45"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-11 items-center justify-center border border-border/70 bg-muted/40",
                            enabled &&
                              "transition-colors group-hover:border-foreground/20 group-hover:bg-background"
                          )}
                        >
                          <Icon className="size-5" />
                        </span>
                        <span className="space-y-1.5">
                          <span className="block font-heading text-lg font-medium tracking-tight">
                            {entry.title}
                          </span>
                          <span className="block text-sm leading-relaxed text-muted-foreground">
                            {entry.description}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "mt-auto flex items-center gap-1.5 text-sm font-medium",
                            enabled
                              ? "text-foreground/70"
                              : "text-muted-foreground"
                          )}
                        >
                          {enabled ? (
                            <>
                              Auswählen
                              <ArrowRightIcon className="size-4" />
                            </>
                          ) : (
                            "Demnächst"
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <WizardNav onBack={goBack} />
              </section>
            ) : null}

            {step === "delegate" ? (
              <section className="space-y-5">
                <div className="surface-card space-y-6 p-6 md:p-8">
                  <div className="space-y-3">
                    <Label>Mitarbeiter</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(delegateCandidates.length > 0
                        ? delegateCandidates
                        : colleagues
                      ).map((person) => {
                        const selected = delegateAssignee === person.id;
                        return (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => setDelegateAssignee(person.id)}
                            className={cn(
                              "rounded-none border px-4 py-3 text-left transition-colors",
                              selected
                                ? "border-foreground bg-muted/40"
                                : "border-border/70 hover:border-foreground/25"
                            )}
                          >
                            <span className="block font-medium">
                              {person.name}
                              {person.id === currentUserId ? " (ich)" : ""}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {person.email}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {delegateCandidates.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Keine weiteren Nutzer in der Kanzlei — Zuweisung an sich
                        selbst ist möglich.
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    <div className="relative space-y-2">
                      <Label htmlFor="delegate-client">Mandant (optional)</Label>
                      <Input
                        id="delegate-client"
                        value={
                          delegateClientOpen || !selectedDelegateClient
                            ? delegateClientQuery
                            : selectedDelegateClient.name
                        }
                        onChange={(event) => {
                          setDelegateClientQuery(event.target.value);
                          setDelegateClientId("");
                          setDelegateMatterId("");
                          setDelegateClientOpen(true);
                        }}
                        onFocus={() => {
                          setDelegateClientOpen(true);
                          if (selectedDelegateClient) {
                            setDelegateClientQuery(selectedDelegateClient.name);
                          }
                        }}
                        onBlur={handleDelegateClientBlur}
                        placeholder="Mandant tippen…"
                        className="h-11 rounded-none"
                        autoComplete="off"
                      />
                      {delegateClientOpen ? (
                        <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto border border-border bg-background shadow-md">
                          <li>
                            <button
                              type="button"
                              className="w-full px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-muted/50"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setDelegateClientId("");
                                setDelegateClientQuery("");
                                setDelegateMatterId("");
                                setDelegateClientOpen(false);
                              }}
                            >
                              Ohne Mandant
                            </button>
                          </li>
                          {filteredDelegateClients.length === 0 ? (
                            <li className="px-3 py-2.5 text-sm text-muted-foreground">
                              Kein Treffer
                            </li>
                          ) : (
                            filteredDelegateClients.map((client) => (
                              <li key={client.id}>
                                <button
                                  type="button"
                                  className={cn(
                                    "w-full px-3 py-2.5 text-left text-sm hover:bg-muted/50",
                                    delegateClientId === client.id &&
                                      "bg-muted/40 font-medium"
                                  )}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    setDelegateClientId(client.id);
                                    setDelegateClientQuery("");
                                    setDelegateMatterId("");
                                    setDelegateClientOpen(false);
                                  }}
                                >
                                  {client.name}
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      ) : null}
                    </div>

                    {delegateClientId ? (
                      <div className="space-y-3">
                        <Label>Akte (optional)</Label>
                        <div className="grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => {
                              setNewMatterTitle("");
                              setNewMatterReference("");
                              setMatterDialogOpen(true);
                            }}
                            className="flex items-center gap-2 rounded-none border border-border/70 px-4 py-3 text-left transition-colors hover:border-foreground/25"
                          >
                            <PlusIcon className="size-4 shrink-0" />
                            <span className="block font-medium">Neue Akte</span>
                          </button>
                          {delegateMatters.map((matter) => {
                            const selected = delegateMatterId === matter.id;
                            return (
                              <button
                                key={matter.id}
                                type="button"
                                onClick={() => {
                                  setDelegateMatterId(
                                    selected ? "" : matter.id
                                  );
                                }}
                                className={cn(
                                  "rounded-none border px-4 py-3 text-left transition-colors",
                                  selected
                                    ? "border-foreground bg-muted/40"
                                    : "border-border/70 hover:border-foreground/25"
                                )}
                              >
                                <span className="block font-medium">
                                  {matter.title}
                                </span>
                                {matter.reference ? (
                                  <span className="text-sm text-muted-foreground">
                                    {matter.reference}
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delegate-note">
                      Anweisung für den nächsten Schritt
                    </Label>
                    <div
                      className={cn(
                        "flex flex-col gap-4 rounded-3xl border border-border/70 bg-background p-4 shadow-[var(--shadow-elevated)]",
                        "ring-1 ring-foreground/[0.03]",
                        noteHasSession &&
                          "border-foreground/30 ring-foreground/10"
                      )}
                    >
                      {noteHasSession ? (
                        <SessionPreview
                          baseInput={delegateNote}
                          blocks={noteBlocks}
                          listening={noteListening}
                        />
                      ) : (
                        <textarea
                          ref={noteTextareaRef}
                          id="delegate-note"
                          value={delegateNote}
                          onChange={(event) =>
                            setDelegateNote(event.target.value)
                          }
                          placeholder="Was soll der Mitarbeiter als Nächstes tun?"
                          rows={1}
                          className={cn(
                            "min-h-36 w-full resize-none overflow-hidden border-0 bg-transparent",
                            "text-base leading-relaxed outline-none placeholder:text-muted-foreground/70",
                            "focus-visible:ring-0"
                          )}
                          aria-label="Anweisung für den nächsten Schritt"
                        />
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          {noteHasSession ? (
                            <>
                              <Button
                                type="button"
                                onClick={() => acceptNoteDictation()}
                                disabled={
                                  !noteSessionText.trim() &&
                                  !noteBlocks.some(
                                    (block) => block.type === "section"
                                  )
                                }
                                className="h-9 rounded-full px-3.5"
                              >
                                <CheckIcon data-icon="inline-start" />
                                Übernehmen
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={rejectNoteDictation}
                                className="h-9 rounded-full px-3.5"
                              >
                                <XIcon data-icon="inline-start" />
                                Verwerfen
                              </Button>
                            </>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {noteListening ? (
                            <span className="text-xs text-muted-foreground">
                              Hört zu…
                            </span>
                          ) : null}
                          <Button
                            type="button"
                            variant={noteListening ? "default" : "outline"}
                            size="icon-lg"
                            onClick={handleNoteMicClick}
                            aria-pressed={noteListening}
                            aria-label={
                              noteListening
                                ? "Diktieren beenden"
                                : "Anweisung diktieren"
                            }
                            title={
                              noteListening
                                ? "Diktieren beenden"
                                : "Anweisung diktieren"
                            }
                            className={cn(
                              "rounded-full",
                              noteListening && "animate-pulse"
                            )}
                          >
                            {noteListening ? (
                              <MicOffIcon className="size-4" />
                            ) : (
                              <MicIcon className="size-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <WizardNav
                  onBack={goBack}
                  onNext={submitDelegation}
                  nextLabel={isSavingDraft ? "Zuweisen…" : "Delegieren"}
                  nextDisabled={!delegateAssignee.trim() || isSavingDraft}
                />

                <Dialog
                  open={matterDialogOpen}
                  onOpenChange={setMatterDialogOpen}
                >
                  <DialogContent
                    className="rounded-none sm:max-w-md"
                    showCloseButton
                  >
                    <DialogHeader>
                      <DialogTitle className="font-heading text-xl font-medium tracking-tight">
                        Neue Akte
                      </DialogTitle>
                      <p className="text-sm text-muted-foreground">
                        Für{" "}
                        {selectedDelegateClient?.name ?? "den gewählten Mandanten"}
                      </p>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="new-matter-title">Titel</Label>
                        <Input
                          id="new-matter-title"
                          value={newMatterTitle}
                          onChange={(event) =>
                            setNewMatterTitle(event.target.value)
                          }
                          className="h-11 rounded-none"
                          placeholder="z. B. Kündigungsschutz"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-matter-ref">Aktenzeichen</Label>
                        <Input
                          id="new-matter-ref"
                          value={newMatterReference}
                          onChange={(event) =>
                            setNewMatterReference(event.target.value)
                          }
                          className="h-11 rounded-none"
                          placeholder="optional"
                        />
                      </div>
                    </div>
                    <DialogFooter className="rounded-none sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-none"
                        disabled={isCreatingMatter}
                        onClick={() => setMatterDialogOpen(false)}
                      >
                        Abbrechen
                      </Button>
                      <Button
                        type="button"
                        className="h-10 rounded-none"
                        disabled={isCreatingMatter || !newMatterTitle.trim()}
                        onClick={createMatterFromDialog}
                      >
                        {isCreatingMatter ? "Anlegen…" : "Akte anlegen"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <AlertDialog
                  open={clientCreateDialogOpen}
                  onOpenChange={(open) => {
                    setClientCreateDialogOpen(open);
                    if (!open) {
                      setPendingClientName("");
                    }
                  }}
                >
                  <AlertDialogContent className="rounded-none">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-heading">
                        Mandant anlegen?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        „{pendingClientName}" ist noch nicht vorhanden.
                        Möchtest du diesen Mandanten anlegen?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isCreatingClient}>
                        Abbrechen
                      </AlertDialogCancel>
                      <AlertDialogAction
                        disabled={isCreatingClient}
                        onClick={(event) => {
                          event.preventDefault();
                          createDelegateClient();
                        }}
                      >
                        {isCreatingClient ? "Anlegen…" : "Anlegen"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </section>
            ) : null}
          </div>
        </div>

        <aside className="hidden min-h-0 flex-col border-l border-border/60 bg-muted/20 lg:flex">
          <div className="shrink-0 border-b border-border/60 px-5 py-5">
            <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
              Schritte
            </p>
            <p className="mt-1 font-heading text-lg font-medium tracking-tight">
              Schritt {stepIndex + 1} von {steps.length}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <ol className="space-y-0">
              {steps.map((entry, index) => {
                const done = index < stepIndex;
                const active = index === stepIndex;
                const summary = stepSummaries[entry.id];
                const clickable = done;

                return (
                  <li
                    key={entry.id}
                    className="relative flex gap-3 pb-6 last:pb-0"
                  >
                    {index < steps.length - 1 ? (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-8 bottom-0 left-[0.85rem] w-px",
                          done ? "bg-foreground/40" : "bg-border"
                        )}
                      />
                    ) : null}

                    <span
                      className={cn(
                        "relative z-10 flex size-7 shrink-0 items-center justify-center border text-xs font-medium",
                        done &&
                          "border-foreground bg-foreground text-background",
                        active &&
                          "border-foreground bg-background text-foreground",
                        !done &&
                          !active &&
                          "border-border bg-background text-muted-foreground"
                      )}
                    >
                      {done ? <CheckIcon className="size-3.5" /> : index + 1}
                    </span>

                    <div className="min-w-0 flex-1 pt-0.5">
                      {clickable ? (
                        <button
                          type="button"
                          onClick={() => jumpToStep(entry.id)}
                          className="text-left transition-colors hover:text-foreground"
                        >
                          <span className="block text-sm font-medium">
                            {entry.label}
                          </span>
                          {summary ? (
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {summary}
                            </span>
                          ) : null}
                          <span className="mt-1 block text-[11px] text-muted-foreground/80">
                            Ändern
                          </span>
                        </button>
                      ) : (
                        <div>
                          <span
                            className={cn(
                              "block text-sm font-medium",
                              active
                                ? "text-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            {entry.label}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {active ? entry.hint : (summary ?? "Noch offen")}
                          </span>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>
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

function WizardNav({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  showBack = true,
}: {
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {showBack ? (
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-11 rounded-none px-4"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Zurück
        </Button>
      ) : null}
      {onNext ? (
        <Button
          type="button"
          disabled={nextDisabled}
          onClick={onNext}
          className="h-11 rounded-none px-5"
        >
          {nextLabel ?? "Weiter"}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      ) : null}
    </div>
  );
}
