"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  getAiJobStatus,
  previewCaseFactsAnalysis,
  startCaseFactsAnalysisJob,
} from "@/lib/ai/actions";
import {
  approveAiDraftAction,
  discardAiDraftAction,
  saveAiDraftEdits,
} from "@/lib/ai/draft-actions";
import type { AiDraftRecord } from "@/lib/ai/drafts-storage";
import type { ConsentStatusView } from "@/lib/ai/consent";
import { DocMarkdown } from "@/components/docs/doc-markdown";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Step = "input" | "preview" | "running" | "result";

const STATUS_LABEL: Record<AiDraftRecord["status"], string> = {
  draft: "KI-Entwurf",
  approved: "Freigegeben",
  discarded: "Verworfen",
};

const POLL_MS = 2500;

export function MatterCaseFactsAnalysisSection({
  matterId,
  consentStatus,
  canApprove,
  initialDrafts,
}: {
  matterId: string;
  consentStatus: ConsentStatusView;
  canApprove: boolean;
  initialDrafts: AiDraftRecord[];
}) {
  const [facts, setFacts] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [pseudonymizedText, setPseudonymizedText] = useState("");
  const [manualMarkInput, setManualMarkInput] = useState("");
  const [manualMarks, setManualMarks] = useState<string[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatusLabel, setJobStatusLabel] = useState("Analyse gestartet…");
  const [activeDraft, setActiveDraft] = useState<AiDraftRecord | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [unknownPlaceholders, setUnknownPlaceholders] = useState<string[]>([]);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [residuals, setResiduals] = useState<string[]>([]);
  const [dismissedResiduals, setDismissedResiduals] = useState<string[]>([]);
  const [gatePolicy, setGatePolicy] = useState<"block" | "warn">("block");
  const [isPending, startTransition] = useTransition();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasConsent = consentStatus === "granted";

  const openResiduals = useMemo(() => {
    return residuals.filter((r) => {
      const key = r.trim().toLowerCase();
      if (dismissedResiduals.some((d) => d.trim().toLowerCase() === key)) {
        return false;
      }
      if (manualMarks.some((m) => m.trim().toLowerCase() === key)) {
        return false;
      }
      return true;
    });
  }, [residuals, dismissedResiduals, manualMarks]);

  const canConfirmAnalyze =
    gatePolicy === "warn" || openResiduals.length === 0;

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activeJobId || step !== "running") return;

    let cancelled = false;

    function stopPolling() {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    async function poll() {
      if (!activeJobId) return;
      const result = await getAiJobStatus(activeJobId);
      if (cancelled) return;
      if (!result.success) {
        toast.error(result.error);
        stopPolling();
        setStep("preview");
        setActiveJobId(null);
        return;
      }

      if (result.job.status === "pending") {
        setJobStatusLabel("In Warteschlange…");
        return;
      }
      if (result.job.status === "running") {
        setJobStatusLabel(
          "KI analysiert den Sachverhalt (kann mehrere Minuten dauern)…"
        );
        return;
      }
      if (result.job.status === "failed") {
        stopPolling();
        toast.error(
          result.errorMessage ?? "Die KI-Analyse ist fehlgeschlagen."
        );
        setActiveJobId(null);
        setStep("preview");
        return;
      }
      if (result.job.status === "succeeded" && result.draft) {
        stopPolling();
        setActiveDraft(result.draft);
        setEditContent(result.draft.content);
        setUnknownPlaceholders(result.job.unknownPlaceholders);
        setDrafts((prev) => {
          if (prev.some((d) => d.id === result.draft!.id)) return prev;
          return [result.draft!, ...prev];
        });
        setActiveJobId(null);
        setStep("result");
        setEditMode(false);
        toast.success("Analyse fertig (KI-Entwurf).");
      }
    }

    void poll();
    pollRef.current = setInterval(() => {
      void poll();
    }, POLL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [activeJobId, step]);

  const previewWithMarks = useMemo(() => {
    let text = pseudonymizedText;
    for (const mark of [...manualMarks].sort((a, b) => b.length - a.length)) {
      if (!mark.trim()) continue;
      const escaped = mark.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      text = text.replace(
        new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "giu"),
        "[OTHER_…]"
      );
    }
    return text;
  }, [pseudonymizedText, manualMarks]);

  function handlePreview() {
    if (!facts.trim()) {
      toast.error("Bitte einen Sachverhalt eingeben.");
      return;
    }
    startTransition(async () => {
      const result = await previewCaseFactsAnalysis({
        matterId,
        facts: facts.trim(),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setPseudonymizedText(result.pseudonymizedText);
      setResiduals(result.residuals);
      setGatePolicy(result.gatePolicy);
      setDismissedResiduals([]);
      setManualMarks([]);
      setManualMarkInput("");
      setStep("preview");
    });
  }

  function addManualMark() {
    const value = manualMarkInput.trim();
    if (!value) return;
    if (!pseudonymizedText.toLowerCase().includes(value.toLowerCase()) &&
        !previewWithMarks.toLowerCase().includes(value.toLowerCase())) {
      toast.error("Markierung kommt im Vorschau-Text nicht vor.");
      return;
    }
    setManualMarks((prev) =>
      prev.some((m) => m.toLowerCase() === value.toLowerCase())
        ? prev
        : [...prev, value]
    );
    setManualMarkInput("");
  }

  function markResidual(span: string) {
    setManualMarks((prev) =>
      prev.some((m) => m.toLowerCase() === span.toLowerCase())
        ? prev
        : [...prev, span]
    );
  }

  function dismissResidual(span: string) {
    setDismissedResiduals((prev) =>
      prev.some((d) => d.toLowerCase() === span.toLowerCase())
        ? prev
        : [...prev, span]
    );
  }

  function handleConfirmAnalyze() {
    if (!canConfirmAnalyze) {
      toast.error(
        "Bitte alle unklaren Namen markieren oder als kein Personenbezug bestätigen."
      );
      return;
    }
    startTransition(async () => {
      const result = await startCaseFactsAnalysisJob({
        matterId,
        facts: facts.trim(),
        manualMarks,
        dismissedResiduals,
        previewConfirmed: true,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setActiveJobId(result.jobId);
      setJobStatusLabel("Analyse gestartet…");
      setStep("running");
      toast.message("Analyse läuft im Hintergrund.");
    });
  }

  function handleSaveEdits() {
    if (!activeDraft) return;
    startTransition(async () => {
      const result = await saveAiDraftEdits(activeDraft.id, editContent);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setActiveDraft(result.item);
      setDrafts((prev) =>
        prev.map((d) => (d.id === result.item.id ? result.item : d))
      );
      setEditMode(false);
      toast.success("Entwurf gespeichert.");
    });
  }

  function handleApprove() {
    if (!activeDraft) return;
    startTransition(async () => {
      const result = await approveAiDraftAction(activeDraft.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setActiveDraft(result.item);
      setDrafts((prev) =>
        prev.map((d) => (d.id === result.item.id ? result.item : d))
      );
      toast.success("Entwurf freigegeben und in der Akte gespeichert.");
    });
  }

  function handleDiscard() {
    if (!activeDraft) return;
    startTransition(async () => {
      const result = await discardAiDraftAction(activeDraft.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setActiveDraft(result.item);
      setDrafts((prev) =>
        prev.map((d) => (d.id === result.item.id ? result.item : d))
      );
      toast.success("Entwurf verworfen.");
    });
  }

  function openDraft(draft: AiDraftRecord) {
    setActiveDraft(draft);
    setEditContent(draft.content);
    setUnknownPlaceholders([]);
    setStep("result");
    setEditMode(false);
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-medium tracking-tight">
          Sachverhaltsanalyse (KI)
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Entwurf zur Prüfung — getrennt vom Prompt-Baukasten „Sachverhalt
          verarbeiten“.
        </p>
      </div>

      <p className="rounded-none border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
        KI-Ergebnisse können Fehler enthalten. Fakten, Normen und Fristen vor
        Verwendung prüfen.
      </p>

      {step === "input" ? (
        <div className="surface-card space-y-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="case-facts">Sachverhalt</Label>
            <Textarea
              id="case-facts"
              value={facts}
              onChange={(event) => setFacts(event.target.value)}
              rows={10}
              className="rounded-none"
              placeholder="Sachverhalt eingeben…"
              disabled={!hasConsent || isPending}
            />
          </div>
          {!hasConsent ? (
            <p className="text-sm text-muted-foreground">
              Keine KI-Einwilligung des Mandanten — bitte zuerst unter dem
              Mandanten erfassen.
            </p>
          ) : null}
          <Button
            type="button"
            disabled={!hasConsent || isPending || !facts.trim()}
            onClick={handlePreview}
            className="h-11 rounded-none px-5"
          >
            {isPending ? "Wird vorbereitet…" : "Mit KI analysieren"}
          </Button>
        </div>
      ) : null}

      {step === "preview" ? (
        <div className="surface-card space-y-4 p-6">
          <h3 className="font-heading text-base font-medium">
            Vorschau (pseudonymisiert)
          </h3>
          <p className="text-sm text-muted-foreground">
            So wird der Text an die KI gesendet. Zusätzliche Stellen markieren,
            die ersetzt werden sollen.
          </p>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap border border-border/70 bg-muted/30 p-4 text-sm">
            {previewWithMarks}
          </pre>

          {openResiduals.length > 0 ? (
            <div className="space-y-2 border border-amber-600/40 bg-amber-500/10 p-4">
              <p className="text-sm font-medium">
                {gatePolicy === "block"
                  ? "Unklare Stellen — vor dem Senden klären"
                  : "Hinweis: mögliche unklare Stellen"}
              </p>
              <ul className="space-y-2">
                {openResiduals.map((span) => (
                  <li
                    key={span}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <code className="font-mono text-xs">{span}</code>
                    <span className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-none"
                        onClick={() => markResidual(span)}
                      >
                        Markieren
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-none"
                        onClick={() => dismissResidual(span)}
                      >
                        Kein Personenbezug
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="manual-mark">Zusätzlich markieren</Label>
              <Textarea
                id="manual-mark"
                value={manualMarkInput}
                onChange={(event) => setManualMarkInput(event.target.value)}
                rows={2}
                className="rounded-none"
                placeholder="Textstelle aus der Vorschau"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-none"
              onClick={addManualMark}
            >
              Als [OTHER] markieren
            </Button>
          </div>
          {manualMarks.length > 0 ? (
            <ul className="flex flex-wrap gap-2 text-sm">
              {manualMarks.map((mark) => (
                <li
                  key={mark}
                  className="border border-border/70 bg-muted/40 px-2 py-1"
                >
                  {mark}
                  <button
                    type="button"
                    className="ml-2 text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setManualMarks((prev) => prev.filter((m) => m !== mark))
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={isPending || !canConfirmAnalyze}
              onClick={handleConfirmAnalyze}
              className="h-11 rounded-none px-5"
            >
              Bestätigen und analysieren
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 rounded-none"
              disabled={isPending}
              onClick={() => setStep("input")}
            >
              Zurück
            </Button>
          </div>
        </div>
      ) : null}

      {step === "running" ? (
        <div className="surface-card space-y-4 p-6">
          <h3 className="font-heading text-base font-medium">Analyse läuft</h3>
          <p className="text-sm text-muted-foreground">{jobStatusLabel}</p>
          <p className="text-sm text-muted-foreground">
            Sie können die Akte weiter nutzen. Das Ergebnis erscheint hier
            automatisch.
          </p>
          <div
            className="h-1 w-full overflow-hidden bg-muted"
            aria-hidden
          >
            <div className="h-full w-1/3 animate-pulse bg-primary" />
          </div>
        </div>
      ) : null}

      {step === "result" && activeDraft ? (
        <div className="surface-card space-y-4 p-6">
          <div className="rounded-none border border-amber-600/50 bg-amber-500/15 px-4 py-3">
            <p className="font-medium">
              {STATUS_LABEL[activeDraft.status]}
              {activeDraft.status === "draft"
                ? " – vor Verwendung prüfen"
                : ""}
            </p>
          </div>

          {unknownPlaceholders.length > 0 ? (
            <p className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
              Unbekannte Platzhalter in der Antwort:{" "}
              {unknownPlaceholders.join(", ")}
            </p>
          ) : null}

          {editMode ? (
            <Textarea
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              rows={18}
              className="rounded-none font-mono text-sm"
            />
          ) : (
            <DocMarkdown content={activeDraft.content} />
          )}

          <div className="flex flex-wrap gap-2 border-t border-border/70 pt-4">
            {activeDraft.status === "draft" ? (
              <>
                {editMode ? (
                  <Button
                    type="button"
                    disabled={isPending}
                    onClick={handleSaveEdits}
                    className="h-11 rounded-none px-5"
                  >
                    Änderungen speichern
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => {
                      setEditContent(activeDraft.content);
                      setEditMode(true);
                    }}
                    className="h-11 rounded-none px-5"
                  >
                    Bearbeiten
                  </Button>
                )}
                <Button
                  type="button"
                  disabled={isPending || !canApprove}
                  onClick={handleApprove}
                  className="h-11 rounded-none px-5"
                  title={
                    canApprove
                      ? undefined
                      : "Freigabe nur durch einen Rechtsanwalt"
                  }
                >
                  Freigeben und in Akte speichern
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={handleDiscard}
                  className="h-11 rounded-none px-5"
                >
                  Verwerfen
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="h-11 rounded-none"
              onClick={() => {
                setStep("input");
                setActiveDraft(null);
                setEditMode(false);
              }}
            >
              Neue Analyse
            </Button>
          </div>
        </div>
      ) : null}

      {drafts.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-heading text-base font-medium">
            Gespeicherte Entwürfe
          </h3>
          <ul className="space-y-2">
            {drafts.map((draft) => (
              <li key={draft.id}>
                <button
                  type="button"
                  className="surface-card w-full px-4 py-3 text-left text-sm hover:bg-muted/40"
                  onClick={() => openDraft(draft)}
                >
                  <span className="font-medium">
                    {STATUS_LABEL[draft.status]}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    ·{" "}
                    {new Intl.DateTimeFormat("de-DE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Europe/Berlin",
                    }).format(new Date(draft.createdAt))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
