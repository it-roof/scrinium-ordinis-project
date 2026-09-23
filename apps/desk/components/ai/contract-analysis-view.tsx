"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  analyzeContract,
  previewContractAnalysis,
} from "@/lib/ai/contract-actions";
import { AI_CONTRACT_MAX_CHARS } from "@/lib/ai/limits";
import { DocMarkdown } from "@/components/docs/doc-markdown";
import { Button } from "@/components/desk/ui/button";
import { Textarea } from "@/components/desk/ui/textarea";

type Step = "input" | "preview" | "result";

export function ContractAnalysisView() {
  const [contractText, setContractText] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [pseudonymizedText, setPseudonymizedText] = useState("");
  const [placeholderCount, setPlaceholderCount] = useState(0);
  const [manualMarkInput, setManualMarkInput] = useState("");
  const [manualMarks, setManualMarks] = useState<string[]>([]);
  const [residuals, setResiduals] = useState<string[]>([]);
  const [dismissedResiduals, setDismissedResiduals] = useState<string[]>([]);
  const [gatePolicy, setGatePolicy] = useState<"block" | "warn">("block");
  const [analysis, setAnalysis] = useState("");
  const [unknownPlaceholders, setUnknownPlaceholders] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

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

  const canConfirm = gatePolicy === "warn" || openResiduals.length === 0;

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

  function resetAll() {
    setStep("input");
    setPseudonymizedText("");
    setPlaceholderCount(0);
    setManualMarks([]);
    setManualMarkInput("");
    setResiduals([]);
    setDismissedResiduals([]);
    setAnalysis("");
    setUnknownPlaceholders([]);
  }

  function handlePreview() {
    const text = contractText.trim();
    if (!text) {
      toast.error("Bitte einen Vertragstext einfügen.");
      return;
    }
    if (text.length > AI_CONTRACT_MAX_CHARS) {
      toast.error(`Maximal ${AI_CONTRACT_MAX_CHARS} Zeichen.`);
      return;
    }
    startTransition(async () => {
      const result = await previewContractAnalysis({
        contractText: text,
        manualMarks,
        dismissedResiduals,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setPseudonymizedText(result.pseudonymizedText);
      setPlaceholderCount(result.placeholderCount);
      setResiduals(result.residuals);
      setGatePolicy(result.gatePolicy);
      setStep("preview");
    });
  }

  function refreshPreviewWith(
    nextMarks: string[],
    nextDismissed: string[]
  ) {
    const text = contractText.trim();
    startTransition(async () => {
      const result = await previewContractAnalysis({
        contractText: text,
        manualMarks: nextMarks,
        dismissedResiduals: nextDismissed,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setPseudonymizedText(result.pseudonymizedText);
      setPlaceholderCount(result.placeholderCount);
      setResiduals(result.residuals);
      setGatePolicy(result.gatePolicy);
    });
  }

  function addMark() {
    const v = manualMarkInput.trim();
    if (!v) return;
    if (manualMarks.some((m) => m.toLowerCase() === v.toLowerCase())) {
      setManualMarkInput("");
      return;
    }
    const next = [...manualMarks, v];
    setManualMarks(next);
    setManualMarkInput("");
    refreshPreviewWith(next, dismissedResiduals);
  }

  function dismissResidual(value: string) {
    const next = [...dismissedResiduals, value];
    setDismissedResiduals(next);
    refreshPreviewWith(manualMarks, next);
  }

  function handleAnalyze() {
    if (!canConfirm) {
      toast.error("Bitte noch offene Namen markieren oder freigeben.");
      return;
    }
    startTransition(async () => {
      const result = await analyzeContract({
        contractText: contractText.trim(),
        manualMarks,
        dismissedResiduals,
        previewConfirmed: true,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setAnalysis(result.analysis);
      setUnknownPlaceholders(result.unknownPlaceholders);
      setStep("result");
      toast.success("Vertragsanalyse fertig.");
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Vertragsanalyse
        </h1>
        <p className="text-sm text-muted-foreground">
          Vertrag einfügen — vor dem Versand an die KI werden Namen lokal
          pseudonymisiert (wie bei der KI-Analyse). Ergebnis bleibt in diesem
          Tab.
        </p>
      </div>

      {step === "input" ? (
        <div className="space-y-4">
          <Textarea
            value={contractText}
            onChange={(e) => setContractText(e.target.value)}
            placeholder="Vertragstext hier einfügen…"
            rows={16}
            className="min-h-[280px] font-mono text-sm"
            maxLength={AI_CONTRACT_MAX_CHARS}
            disabled={isPending}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {contractText.length.toLocaleString("de-DE")} /{" "}
              {AI_CONTRACT_MAX_CHARS.toLocaleString("de-DE")} Zeichen
            </p>
            <Button
              type="button"
              onClick={handlePreview}
              disabled={isPending || !contractText.trim()}
            >
              {isPending ? "Prüft…" : "Vorschau (Pseudonym)"}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "preview" ? (
        <div className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Pseudonymisierte Vorschau</h2>
            <p className="text-xs text-muted-foreground">
              {placeholderCount} Platzhalter · Gate: {gatePolicy}
            </p>
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/70 bg-muted/40 p-4 text-xs leading-relaxed">
              {previewWithMarks}
            </pre>
          </div>

          {openResiduals.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-amber-200/80 bg-amber-50/80 p-4">
              <p className="text-sm font-medium text-amber-950">
                Noch unklare Treffer — markieren oder als kein Personenbezug
                bestätigen
              </p>
              <ul className="space-y-2">
                {openResiduals.map((r) => (
                  <li
                    key={r}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span className="font-mono">{r}</span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => {
                          const next = [...manualMarks, r];
                          setManualMarks(next);
                          refreshPreviewWith(next, dismissedResiduals);
                        }}
                      >
                        Als [OTHER] markieren
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => dismissResidual(r)}
                      >
                        Kein Personenbezug
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Keine offenen Reste — Analyse kann gestartet werden.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Textarea
              value={manualMarkInput}
              onChange={(e) => setManualMarkInput(e.target.value)}
              placeholder="Weiteren Namen manuell markieren…"
              rows={1}
              className="min-h-9 flex-1"
              disabled={isPending}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addMark}
              disabled={isPending || !manualMarkInput.trim()}
            >
              Markieren
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("input")}
              disabled={isPending}
            >
              Zurück
            </Button>
            <Button
              type="button"
              onClick={handleAnalyze}
              disabled={isPending || !canConfirm}
            >
              {isPending ? "Analysiert…" : "Bestätigen und analysieren"}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "result" ? (
        <div className="space-y-4">
          {unknownPlaceholders.length > 0 ? (
            <p className="text-sm text-amber-800">
              Unbekannte Platzhalter in der Antwort:{" "}
              {unknownPlaceholders.join(", ")}
            </p>
          ) : null}
          <div className="prose prose-sm max-w-none rounded-lg border border-border/70 bg-background p-5">
            <DocMarkdown content={analysis} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={resetAll}>
              Neue Analyse
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(analysis);
                toast.success("Analyse kopiert.");
              }}
            >
              Kopieren
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
