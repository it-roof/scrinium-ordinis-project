"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeftIcon,
  ClipboardPasteIcon,
  DownloadIcon,
  FileTextIcon,
  FileUpIcon,
  SendIcon,
  UserRoundIcon,
} from "lucide-react";
import { toast } from "sonner";

import { LetterWorkflowFork } from "@/components/letters/letter-workflow-fork";
import { PageHeader } from "@/components/layout/page-header";
import { useAreaBasePath } from "@/lib/area/use-area-path";
import {
  assignLetter,
  createAndAssignLetter,
  createLetter,
  sendLetter,
  setLetterStatus,
  updateLetter,
} from "@/lib/letters/actions";
import { letterFilename } from "@/lib/letters/document-model";
import {
  exportLetterDocx,
  exportLetterPdf,
} from "@/lib/letters/export-actions";
import {
  isMarkdownFilename,
  parseMarkdownLetter,
  serializeMarkdownLetter,
} from "@/lib/letters/parse-markdown";
import {
  applyPlaceholdersToFields,
  findPlaceholders,
} from "@/lib/letters/placeholders";
import {
  LETTER_KIND_LABELS,
  LETTER_KIND_OPTIONS,
  LETTER_STATUS_LABELS,
  type LetterColleague,
  type LetterInput,
  type LetterKind,
  type LetterRecord,
  type LetterStatus,
} from "@/lib/letters/types";
import { consumePromptKitLetterDraft } from "@/lib/prompt-kit/letter-draft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function downloadBase64(filename: string, mimeType: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

type LetterFormProps = {
  mode: "create" | "edit";
  letterId?: string;
  initialValues?: LetterRecord;
  defaultKind?: LetterKind;
  defaultTitle?: string;
  defaultMatterId?: string;
  colleagues: LetterColleague[];
  currentUserId: string;
  matters: { id: string; title: string; clientName: string }[];
  /** Direkt Delegations-Dialog öffnen (z. B. aus Sachverhalt-Wizard). */
  openDelegateFork?: boolean;
};

export function LetterForm({
  mode,
  letterId: initialLetterId,
  initialValues,
  defaultKind,
  defaultTitle,
  defaultMatterId,
  colleagues,
  currentUserId,
  matters,
  openDelegateFork = false,
}: LetterFormProps) {
  const router = useRouter();
  const basePath = useAreaBasePath() ?? "";
  const lettersBase = `${basePath}/schreiben`;
  const letterId = initialLetterId;
  const [title, setTitle] = useState(
    initialValues?.title ?? defaultTitle ?? ""
  );
  const [kind, setKind] = useState<LetterKind>(
    initialValues?.kind ?? defaultKind ?? "schreiben"
  );
  const [subject, setSubject] = useState(initialValues?.subject ?? "");
  const [salutation, setSalutation] = useState(
    initialValues?.salutation ?? ""
  );
  const [body, setBody] = useState(initialValues?.body ?? "");
  const [closing, setClosing] = useState(initialValues?.closing ?? "");
  const [recipientEmail, setRecipientEmail] = useState(
    initialValues?.recipientEmail ?? ""
  );
  const [status, setStatus] = useState<LetterStatus>(
    initialValues?.status ?? "entwurf"
  );
  const [assignedTo, setAssignedTo] = useState(
    initialValues?.assignedTo ?? currentUserId
  );
  const [assignedToName, setAssignedToName] = useState(
    initialValues?.assignedToName ?? null
  );
  const [matterId, setMatterId] = useState(
    initialValues?.matterId ?? defaultMatterId ?? ""
  );
  const [placeholderValues, setPlaceholderValues] = useState<
    Record<string, string>
  >({});
  const [showFork, setShowFork] = useState(false);
  const [forkStartAt, setForkStartAt] = useState<"choose" | "assign">("choose");
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [isPending, startTransition] = useTransition();
  const mdInputRef = useRef<HTMLInputElement>(null);
  const draftForkShown = useRef(false);

  useEffect(() => {
    if (mode !== "create" || initialValues) {
      return;
    }
    const draft = consumePromptKitLetterDraft();
    if (!draft) {
      return;
    }
    const parsed = parseMarkdownLetter(draft.body);
    setKind(draft.kind);
    setTitle((current) =>
      current.trim() ? current : draft.title || parsed.subject || "Schreiben"
    );
    if (parsed.subject) setSubject(parsed.subject);
    if (parsed.salutation) setSalutation(parsed.salutation);
    if (parsed.closing) setClosing(parsed.closing);
    setBody(parsed.body || draft.body);
    if (!draftForkShown.current) {
      draftForkShown.current = true;
      if (draft.workflow === "delegate") {
        setForkStartAt("assign");
        setShowFork(true);
      }
    }
  }, [initialValues, mode]);

  useEffect(() => {
    if (!openDelegateFork || draftForkShown.current) {
      return;
    }
    draftForkShown.current = true;
    setForkStartAt("assign");
    setShowFork(true);
  }, [openDelegateFork]);

  const placeholders = useMemo(
    () => findPlaceholders(subject, salutation, body, closing),
    [subject, salutation, body, closing]
  );

  function currentInput(): LetterInput {
    return {
      title,
      kind,
      subject,
      salutation,
      body,
      closing,
      module: "legal",
      recipientEmail,
      matterId: matterId || null,
    };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = currentInput();

    startTransition(async () => {
      const result =
        mode === "edit" && letterId
          ? await updateLetter(letterId, input)
          : await createLetter(input);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "edit" ? "Schreiben gespeichert." : "Schreiben angelegt."
      );
      if (mode === "create") {
        router.push(`${lettersBase}/${result.item.id}/bearbeiten`);
      } else {
        setStatus(result.item.status);
        setAssignedTo(result.item.assignedTo ?? currentUserId);
        setAssignedToName(result.item.assignedToName);
        router.refresh();
      }
    });
  }

  function applyMarkdownText(text: string) {
    const parsed = parseMarkdownLetter(text);
    if (parsed.subject) setSubject(parsed.subject);
    if (parsed.salutation) setSalutation(parsed.salutation);
    if (parsed.closing) setClosing(parsed.closing);
    setBody(parsed.body || text.trim());
    setTitle((current) =>
      current.trim() ? current : parsed.subject || "Entwurf aus KI"
    );
    setShowFork(true);
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.error("Zwischenablage ist leer.");
        return;
      }
      applyMarkdownText(text);
      toast.success("Text eingefügt.");
    } catch {
      toast.error("Zwischenablage nicht lesbar.");
    }
  }

  async function importMarkdownFile(file: File) {
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
      applyMarkdownText(text);
      setTitle((current) =>
        current.trim() && current !== "Entwurf aus KI" && current !== "Schreiben"
          ? current
          : file.name.replace(/\.md$/i, "") || "Entwurf aus KI"
      );
      toast.success("Markdown-Datei übernommen.");
    } catch {
      toast.error("Datei konnte nicht gelesen werden.");
    }
  }

  function downloadMarkdown() {
    const markdown = serializeMarkdownLetter({
      subject,
      salutation,
      body,
      closing,
    });
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = letterFilename(title || "schreiben", "md");
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown-Datei erstellt.");
  }

  function applyPlaceholders() {
    const next = applyPlaceholdersToFields(
      { subject, salutation, body, closing },
      placeholderValues
    );
    setSubject(next.subject);
    setSalutation(next.salutation);
    setBody(next.body);
    setClosing(next.closing);
    toast.success("Platzhalter ersetzt.");
  }

  function handleExport(format: "pdf" | "docx") {
    if (!letterId) {
      toast.error("Bitte zuerst speichern.");
      return;
    }
    startTransition(async () => {
      const save = await updateLetter(letterId, currentInput());
      if (!save.success) {
        toast.error(save.error);
        return;
      }
      const result =
        format === "pdf"
          ? await exportLetterPdf(letterId)
          : await exportLetterDocx(letterId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      downloadBase64(result.filename, result.mimeType, result.base64);
      toast.success(format === "pdf" ? "PDF erstellt." : "Word erstellt.");
      router.refresh();
    });
  }

  function handleForkAssign(input: {
    assignedTo: string;
    intent: "bearbeiten" | "pruefung";
  }) {
    startTransition(async () => {
      if (letterId) {
        const save = await updateLetter(letterId, currentInput());
        if (!save.success) {
          toast.error(save.error);
          return;
        }
        const result = await assignLetter(
          letterId,
          input.assignedTo,
          input.intent
        );
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setStatus(result.item.status);
        setAssignedTo(result.item.assignedTo ?? input.assignedTo);
        setAssignedToName(result.item.assignedToName);
        setShowFork(false);
        setShowAssignPanel(false);
        toast.success(
          input.intent === "pruefung"
            ? "Zur Prüfung zugewiesen."
            : "Zur Bearbeitung zugewiesen."
        );
        router.refresh();
        return;
      }

      const result = await createAndAssignLetter({
        letter: currentInput(),
        assignedTo: input.assignedTo,
        intent: input.intent,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        input.intent === "pruefung"
          ? "Gespeichert und zur Prüfung zugewiesen."
          : "Gespeichert und zugewiesen."
      );
      router.push(`${lettersBase}/${result.item.id}/bearbeiten`);
    });
  }

  function handleStatus(next: LetterStatus) {
    if (!letterId) {
      toast.error("Bitte zuerst speichern.");
      return;
    }
    startTransition(async () => {
      const save = await updateLetter(letterId, currentInput());
      if (!save.success) {
        toast.error(save.error);
        return;
      }
      const result = await setLetterStatus(letterId, next);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setStatus(result.item.status);
      toast.success(`Status: ${LETTER_STATUS_LABELS[result.item.status]}`);
      router.refresh();
    });
  }

  function handleSend() {
    if (!letterId) {
      toast.error("Bitte zuerst speichern.");
      return;
    }
    startTransition(async () => {
      const save = await updateLetter(letterId, currentInput());
      if (!save.success) {
        toast.error(save.error);
        return;
      }
      const result = await sendLetter(letterId, recipientEmail);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setStatus(result.item.status);
      setRecipientEmail(result.item.recipientEmail);
      toast.success("Schreiben versendet.");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 pb-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-fit px-0 text-muted-foreground hover:text-foreground"
      >
        <Link href={lettersBase}>
          <ArrowLeftIcon data-icon="inline-start" />
          Zurück zur Übersicht
        </Link>
      </Button>

      <PageHeader
        title={mode === "edit" || letterId ? "Schreiben bearbeiten" : "Neues Schreiben"}
        description="Betreff, Anrede, Text, Schluss — Platzhalter {{NAME}} werden erkannt."
      >
        <div className="flex flex-wrap gap-2">
          <input
            ref={mdInputRef}
            type="file"
            accept=".md,text/markdown"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                void importMarkdownFile(file);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={pasteFromClipboard}
            className="h-10 rounded-none"
          >
            <ClipboardPasteIcon data-icon="inline-start" />
            Einfügen
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => mdInputRef.current?.click()}
            className="h-10 rounded-none"
          >
            <FileUpIcon data-icon="inline-start" />
            .md
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={downloadMarkdown}
            className="h-10 rounded-none"
          >
            <DownloadIcon data-icon="inline-start" />
            .md speichern
          </Button>
          {letterId ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => handleExport("pdf")}
                className="h-10 rounded-none"
              >
                <FileTextIcon data-icon="inline-start" />
                PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => handleExport("docx")}
                className="h-10 rounded-none"
              >
                <DownloadIcon data-icon="inline-start" />
                Word
              </Button>
            </>
          ) : null}
        </div>
      </PageHeader>

      {showFork ? (
        <LetterWorkflowFork
          colleagues={colleagues}
          currentUserId={currentUserId}
          busy={isPending}
          startAt={forkStartAt}
          onEdit={() => setShowFork(false)}
          onAssign={handleForkAssign}
        />
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]"
      >
        <div className="surface-card space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="letter-title">Titel</Label>
              <Input
                id="letter-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Interner Name"
                className="h-11 rounded-none"
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="letter-matter">Akte</Label>
              <select
                id="letter-matter"
                value={matterId}
                onChange={(event) => setMatterId(event.target.value)}
                className="flex h-11 w-full rounded-none border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Ohne Akte</option>
                {matters.map((matter) => (
                  <option key={matter.id} value={matter.id}>
                    {matter.clientName} — {matter.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="letter-kind">Typ</Label>
              <select
                id="letter-kind"
                value={kind}
                onChange={(event) => setKind(event.target.value as LetterKind)}
                className="flex h-11 w-full rounded-none border border-input bg-transparent px-3 text-sm"
              >
                {LETTER_KIND_OPTIONS.map((entry) => (
                  <option key={entry} value={entry}>
                    {LETTER_KIND_LABELS[entry]}
                  </option>
                ))}
                {kind === "vermerk" ? (
                  <option value="vermerk">{LETTER_KIND_LABELS.vermerk}</option>
                ) : null}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="letter-subject">Betreff</Label>
              <Input
                id="letter-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Betreffzeile"
                className="h-11 rounded-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="letter-salutation">Anrede</Label>
            <Input
              id="letter-salutation"
              value={salutation}
              onChange={(event) => setSalutation(event.target.value)}
              placeholder="Sehr geehrte Damen und Herren,"
              className="h-11 rounded-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="letter-body">Inhalt</Label>
            <Textarea
              id="letter-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Absätze — Leerzeile trennt Absätze. Platzhalter z. B. {{MANDANT_NAME}}."
              rows={14}
              className="min-h-64 rounded-none text-base leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="letter-closing">Schluss</Label>
            <Textarea
              id="letter-closing"
              value={closing}
              onChange={(event) => setClosing(event.target.value)}
              placeholder="Mit freundlichen Grüßen"
              rows={3}
              className="rounded-none"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="h-11 rounded-none px-5"
          >
            Speichern
          </Button>
        </div>

        <aside className="space-y-4">
          <div className="surface-card h-fit space-y-4 p-5">
            <div>
              <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                Workflow
              </p>
              <p className="mt-1 font-heading text-base font-medium">
                {LETTER_STATUS_LABELS[status]}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Zuständig:{" "}
                {assignedToName ??
                  colleagues.find((c) => c.id === assignedTo)?.name ??
                  "—"}
              </p>
              {initialValues?.assignmentNote ? (
                <div className="mt-3 rounded-none border border-border/60 bg-muted/30 px-3 py-2">
                  <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                    Anweisung
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">
                    {initialValues.assignmentNote}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setShowAssignPanel((open) => !open);
                  setShowFork(false);
                }}
                className="h-10 w-full rounded-none"
              >
                <UserRoundIcon data-icon="inline-start" />
                Delegieren
              </Button>
              {status === "zur_pruefung" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending || !letterId}
                  onClick={() => handleStatus("freigegeben")}
                  className="h-10 w-full rounded-none"
                >
                  Freigeben
                </Button>
              ) : null}
              {status !== "zur_pruefung" && status !== "versendet" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending || !letterId}
                  onClick={() => handleStatus("zur_pruefung")}
                  className="h-10 w-full rounded-none"
                >
                  Zur Prüfung setzen
                </Button>
              ) : null}
              {status === "freigegeben" || status === "entwurf" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending || !letterId}
                  onClick={() => handleStatus("freigegeben")}
                  className="h-10 w-full rounded-none"
                >
                  Als freigegeben markieren
                </Button>
              ) : null}
            </div>

            {showAssignPanel ? (
              <LetterWorkflowFork
                colleagues={colleagues}
                currentUserId={currentUserId}
                busy={isPending}
                startAt="assign"
                onEdit={() => setShowAssignPanel(false)}
                onAssign={handleForkAssign}
              />
            ) : null}

            <div className="space-y-2 border-t border-border/60 pt-4">
              <Label htmlFor="letter-recipient">Empfänger (Versand)</Label>
              <Input
                id="letter-recipient"
                type="email"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                placeholder="empfaenger@example.de"
                className="h-10 rounded-none"
              />
              <Button
                type="button"
                disabled={isPending || !letterId || status === "versendet"}
                onClick={handleSend}
                className="h-10 w-full rounded-none"
              >
                <SendIcon data-icon="inline-start" />
                Versenden
              </Button>
              <p className="text-xs text-muted-foreground">
                Versand über das eigene SMTP in den Einstellungen. Anwalt und
                Mitarbeiter dürfen versenden.
              </p>
            </div>
          </div>

          <div className="surface-card h-fit space-y-4 p-5">
            <div>
              <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                Platzhalter
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Format <code className="text-xs">{"{{NAME}}"}</code>
              </p>
            </div>

            {placeholders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine Platzhalter gefunden.
              </p>
            ) : (
              <div className="space-y-3">
                {placeholders.map((name) => (
                  <div key={name} className="space-y-1.5">
                    <Label htmlFor={`ph-${name}`} className="font-mono text-xs">
                      {`{{${name}}}`}
                    </Label>
                    <Input
                      id={`ph-${name}`}
                      value={placeholderValues[name] ?? ""}
                      onChange={(event) =>
                        setPlaceholderValues((prev) => ({
                          ...prev,
                          [name]: event.target.value,
                        }))
                      }
                      placeholder="Wert"
                      className="h-9 rounded-none"
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={applyPlaceholders}
                  className={cn("h-10 w-full rounded-none")}
                >
                  Ersetzen
                </Button>
              </div>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}
