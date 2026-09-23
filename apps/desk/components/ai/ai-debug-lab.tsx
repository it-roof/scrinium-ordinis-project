"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckIcon, Loader2Icon } from "lucide-react";

import {
  getAiJobStatus,
  previewCaseFactsAnalysis,
  startCaseFactsAnalysisJob,
} from "@/lib/ai/actions";
import type { AiDebugTrace } from "@/lib/db/schema";
import { hrefFor } from "@/lib/area/paths";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DocMarkdown } from "@/components/docs/doc-markdown";
import type { AnalyseMatterOption } from "@/components/ai/analyse-matter-picker";
import { cn } from "@/lib/utils";

const POLL_MS = 1200;

const STEP_LABEL: Record<string, string> = {
  claimed: "Job übernommen",
  load_context: "Akte laden",
  assert_consent: "Einwilligung",
  pseudonymize: "Stufe 1",
  ner_local: "Stufe 2 NER",
  manual_marks: "Markierungen",
  bedrock_call: "Bedrock …",
  bedrock_ok: "Antwort da",
  repersonalize: "Rückersetzung",
  audit_ok: "Audit",
  draft_created: "Entwurf",
  failed: "Fehler",
};

type Phase = "idle" | "preview" | "running" | "done" | "error";
type Panel = "input" | "pseudo" | "result";

function stageIndex(phase: Phase, hasPseudo: boolean, hasResult: boolean): number {
  if (hasResult || phase === "done") return 3;
  if (phase === "running") return 2;
  if (hasPseudo || phase === "preview") return 1;
  return 0;
}

const STAGES = ["Klartext", "Pseudonym", "Verarbeitung", "Ergebnis"] as const;

export function AiDebugLab({
  matters,
  debugEnabled,
  mattersHref = hrefFor("matters", "legal"),
}: {
  matters: AnalyseMatterOption[];
  debugEnabled: boolean;
  /** Practice-scoped Link zu Akten */
  mattersHref?: string;
}) {
  const [matterId, setMatterId] = useState(matters[0]?.id ?? "");
  const [facts, setFacts] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [panel, setPanel] = useState<Panel>("input");
  const [pseudonymized, setPseudonymized] = useState("");
  const [placeholderCount, setPlaceholderCount] = useState(0);
  const [entityLabels, setEntityLabels] = useState<string[]>([]);
  const [stage1Text, setStage1Text] = useState("");
  const [nerLabels, setNerLabels] = useState<string[]>([]);
  const [residuals, setResiduals] = useState<string[]>([]);
  const [dismissedResiduals, setDismissedResiduals] = useState<string[]>([]);
  const [gatePolicy, setGatePolicy] = useState<"block" | "warn">("block");
  const [jobId, setJobId] = useState<string | null>(null);
  const [trace, setTrace] = useState<AiDebugTrace | null>(null);
  const [resultContent, setResultContent] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState("");
  const [isPending, startTransition] = useTransition();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selected = matters.find((m) => m.id === matterId) ?? null;
  const hasConsent = selected?.consentGranted ?? false;
  const activeStage = stageIndex(phase, Boolean(pseudonymized), Boolean(resultContent));
  const busy = phase === "running" || isPending;

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!jobId || phase !== "running") return;

    let cancelled = false;

    function stop() {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    async function poll() {
      if (!jobId) return;
      const result = await getAiJobStatus(jobId);
      if (cancelled) return;
      if (!result.success) {
        toast.error(result.error);
        stop();
        setPhase("error");
        return;
      }

      if (result.debugTrace) {
        setTrace(result.debugTrace);
        if (result.debugTrace.pseudonymizedUserMessage) {
          setPseudonymized(result.debugTrace.pseudonymizedUserMessage);
          setPanel((p) => (p === "input" ? "pseudo" : p));
        }
      }

      if (result.job.status === "pending") {
        setStatusLabel("Warteschlange");
        return;
      }
      if (result.job.status === "running") {
        setStatusLabel("Läuft");
        return;
      }
      if (result.job.status === "failed") {
        stop();
        setStatusLabel(result.errorMessage ?? "Fehler");
        setPhase("error");
        toast.error(result.errorMessage ?? "Job fehlgeschlagen");
        return;
      }
      if (result.job.status === "succeeded") {
        stop();
        setResultContent(result.draft?.content ?? null);
        setStatusLabel("Fertig");
        setPhase("done");
        setPanel("result");
        toast.success("Pipeline fertig");
      }
    }

    void poll();
    pollRef.current = setInterval(() => {
      void poll();
    }, POLL_MS);

    return () => {
      cancelled = true;
      stop();
    };
  }, [jobId, phase]);

  function handlePreview() {
    if (!matterId || !facts.trim()) {
      toast.error("Akte und Sachverhalt nötig.");
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
      setPseudonymized(result.pseudonymizedText);
      setPlaceholderCount(result.placeholderCount);
      setEntityLabels(result.entityLabels);
      setStage1Text(result.stage1Text);
      setNerLabels(result.nerLabels);
      setResiduals(result.residuals);
      setGatePolicy(result.gatePolicy);
      setDismissedResiduals([]);
      setTrace(null);
      setResultContent(null);
      setJobId(null);
      setPhase("preview");
      setPanel("pseudo");
      if (result.placeholderCount === 0 && result.residuals.length === 0) {
        toast.message("Keine Treffer — Text unverändert.");
      } else if (result.residuals.length > 0 && result.gatePolicy === "block") {
        toast.message(
          `${result.residuals.length} Rest(e) blockieren den Send — markieren oder freigeben.`
        );
      }
    });
  }

  function handleRun() {
    if (!matterId || !facts.trim()) {
      toast.error("Akte und Sachverhalt nötig.");
      return;
    }
    startTransition(async () => {
      const preview = await previewCaseFactsAnalysis({
        matterId,
        facts: facts.trim(),
        dismissedResiduals,
      });
      if (!preview.success) {
        toast.error(preview.error);
        return;
      }
      setPseudonymized(preview.pseudonymizedText);
      setPlaceholderCount(preview.placeholderCount);
      setEntityLabels(preview.entityLabels);
      setStage1Text(preview.stage1Text);
      setNerLabels(preview.nerLabels);
      setResiduals(preview.residuals);
      setGatePolicy(preview.gatePolicy);
      setPanel("pseudo");

      const open = preview.residuals.filter(
        (r) =>
          !dismissedResiduals.some(
            (d) => d.trim().toLowerCase() === r.trim().toLowerCase()
          )
      );
      if (preview.gatePolicy === "block" && open.length > 0) {
        toast.error(
          "Gate blockiert — Reste markieren oder als kein Personenbezug bestätigen."
        );
        setPhase("preview");
        return;
      }

      const result = await startCaseFactsAnalysisJob({
        matterId,
        facts: facts.trim(),
        dismissedResiduals,
        previewConfirmed: true,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setJobId(result.jobId);
      setResultContent(null);
      setTrace(null);
      setStatusLabel("Gestartet");
      setPhase("running");
    });
  }

  function handleReset() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPhase("idle");
    setPanel("input");
    setFacts("");
    setPseudonymized("");
    setPlaceholderCount(0);
    setEntityLabels([]);
    setStage1Text("");
    setNerLabels([]);
    setResiduals([]);
    setDismissedResiduals([]);
    setJobId(null);
    setTrace(null);
    setResultContent(null);
    setStatusLabel("");
  }

  if (!debugEnabled) {
    return (
      <p className="text-sm text-muted-foreground">
        <code className="font-mono text-xs">AI_DEBUG=true</code> und{" "}
        <code className="font-mono text-xs">AI_DEBUG_TENANT_SLUG=test-kanzlei</code>{" "}
        setzen, Server neu starten.
      </p>
    );
  }

  if (matters.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Keine Akten.{" "}
        <Link href={mattersHref} className="text-sky-700 hover:underline">
          Akte anlegen
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Steuerung */}
      <div className="flex flex-col gap-3 border border-border bg-muted/20 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="debug-matter" className="text-xs text-muted-foreground">
            Akte
          </Label>
          <select
            id="debug-matter"
            className="h-9 max-w-md border border-border bg-background px-2 text-sm"
            value={matterId}
            onChange={(e) => setMatterId(e.target.value)}
            disabled={busy}
          >
            {matters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.clientName} — {m.title}
                {!m.consentGranted ? " ⚠" : ""}
              </option>
            ))}
          </select>
          {!hasConsent ? (
            <p className="text-xs text-amber-800">Keine KI-Einwilligung</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-none"
            disabled={!hasConsent || busy}
            onClick={handlePreview}
          >
            Pseudonymisieren
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-none"
            disabled={!hasConsent || busy}
            onClick={handleRun}
          >
            {phase === "running" ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" />
                Läuft…
              </>
            ) : (
              "Pipeline starten"
            )}
          </Button>
          <button
            type="button"
            className="px-2 text-xs text-muted-foreground hover:text-foreground"
            disabled={busy}
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Fortschritt */}
      <ol className="flex items-center gap-1 text-xs sm:gap-2">
        {STAGES.map((label, i) => {
          const done = i < activeStage || (i === activeStage && phase === "done");
          const current = i === activeStage && phase !== "done";
          return (
            <li key={label} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center text-[0.65rem] font-medium",
                  done && "bg-foreground text-background",
                  current && "border border-foreground",
                  !done && !current && "border border-border text-muted-foreground"
                )}
              >
                {done && phase === "done" && i === 3 ? (
                  <CheckIcon className="size-3.5" />
                ) : current && phase === "running" && i === 2 ? (
                  <Loader2Icon className="size-3 animate-spin" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  "truncate",
                  current || done ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
              {i < STAGES.length - 1 ? (
                <span className="mx-1 hidden h-px flex-1 bg-border sm:block" />
              ) : null}
            </li>
          );
        })}
      </ol>

      {statusLabel ? (
        <p className="text-xs text-muted-foreground">
          {statusLabel}
          {jobId ? (
            <span className="ml-2 font-mono opacity-70">{jobId.slice(0, 8)}</span>
          ) : null}
          {trace?.latencyMs != null ? (
            <span className="ml-2">{trace.latencyMs} ms</span>
          ) : null}
          {trace?.inputTokens != null ? (
            <span className="ml-2">
              {trace.inputTokens}→{trace.outputTokens ?? "?"} tok
            </span>
          ) : null}
        </p>
      ) : null}

      {/* Tabs + Inhalt */}
      <div className="border border-border">
        <div className="flex border-b border-border">
          {(
            [
              { id: "input" as const, label: "1 Klartext" },
              {
                id: "pseudo" as const,
                label: placeholderCount
                  ? `2 Pseudonym (${placeholderCount})`
                  : "2 Pseudonym",
                disabled: !pseudonymized && phase === "idle",
              },
              {
                id: "result" as const,
                label: "3 Ergebnis",
                disabled: !resultContent,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={"disabled" in tab ? tab.disabled : false}
              onClick={() => setPanel(tab.id)}
              className={cn(
                "flex-1 px-3 py-2.5 text-left text-sm transition-colors",
                panel === tab.id
                  ? "border-b-2 border-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
                "disabled" in tab && tab.disabled && "opacity-40"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-[20rem]">
          {panel === "input" ? (
            <Textarea
              value={facts}
              onChange={(e) => setFacts(e.target.value)}
              className="min-h-[20rem] resize-y rounded-none border-0 focus-visible:ring-0"
              placeholder="Sachverhalt mit Mandantendaten…"
              disabled={busy}
            />
          ) : null}

          {panel === "pseudo" ? (
            <div className="flex min-h-[20rem] flex-col">
              <div className="space-y-2 border-b border-border px-4 py-3 text-[0.7rem] text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Stufe 1 (DB):</span>{" "}
                  {entityLabels.length
                    ? entityLabels.slice(0, 8).join(" · ")
                    : "—"}
                  {entityLabels.length > 8
                    ? ` · +${entityLabels.length - 8}`
                    : ""}
                </p>
                <p>
                  <span className="font-medium text-foreground">Stufe 2 (NER):</span>{" "}
                  {nerLabels.length ? nerLabels.join(" · ") : "—"}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Gate ({gatePolicy}):
                  </span>{" "}
                  {residuals.filter(
                    (r) =>
                      !dismissedResiduals.some(
                        (d) =>
                          d.trim().toLowerCase() === r.trim().toLowerCase()
                      )
                  ).length === 0
                    ? "keine blockierenden Reste"
                    : `${
                        residuals.filter(
                          (r) =>
                            !dismissedResiduals.some(
                              (d) =>
                                d.trim().toLowerCase() ===
                                r.trim().toLowerCase()
                            )
                        ).length
                      } Rest(e)`}
                </p>
                {residuals.filter(
                  (r) =>
                    !dismissedResiduals.some(
                      (d) => d.trim().toLowerCase() === r.trim().toLowerCase()
                    )
                ).length > 0 ? (
                  <ul className="space-y-1 pt-1">
                    {residuals
                      .filter(
                        (r) =>
                          !dismissedResiduals.some(
                            (d) =>
                              d.trim().toLowerCase() === r.trim().toLowerCase()
                          )
                      )
                      .map((r) => (
                      <li
                        key={r}
                        className="flex flex-wrap items-center gap-2 text-amber-900"
                      >
                        <code className="font-mono text-xs">{r}</code>
                        <button
                          type="button"
                          className="underline"
                          onClick={() =>
                            setDismissedResiduals((prev) =>
                              prev.includes(r) ? prev : [...prev, r]
                            )
                          }
                        >
                          Kein Personenbezug
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {stage1Text && stage1Text !== pseudonymized ? (
                  <details className="pt-1">
                    <summary className="cursor-pointer hover:text-foreground">
                      Nur Stufe 1 (ohne NER)
                    </summary>
                    <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[0.65rem]">
                      {stage1Text}
                    </pre>
                  </details>
                ) : null}
              </div>
              <pre className="max-h-[28rem] flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed">
                {pseudonymized || (
                  <span className="font-sans text-muted-foreground">
                    Noch leer — „Pseudonymisieren“ oder Pipeline starten.
                  </span>
                )}
              </pre>
            </div>
          ) : null}

          {panel === "result" ? (
            <div className="max-h-[28rem] min-h-[20rem] overflow-auto p-4 text-sm">
              {resultContent ? (
                <DocMarkdown content={resultContent} />
              ) : (
                <p className="text-muted-foreground text-xs">
                  Erscheint nach erfolgreicher Pipeline.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Kompakte Schritte */}
      <div className="border border-border">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Schritte
          </span>
          {trace?.model ? (
            <span className="max-w-[50%] truncate font-mono text-[0.65rem] text-muted-foreground">
              {trace.model}
            </span>
          ) : null}
        </div>
        {!trace?.steps?.length ? (
          <p className="px-3 py-3 text-xs text-muted-foreground">
            Erscheinen live während der Pipeline.
          </p>
        ) : (
          <ol className="flex flex-wrap gap-1.5 p-3">
            {trace.steps.map((s, i) => {
              const failed = s.step === "failed";
              const last = i === trace.steps.length - 1;
              return (
                <li
                  key={`${s.at}-${i}`}
                  title={s.detail ?? undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 border px-2 py-1 text-xs",
                    failed && "border-red-300 bg-red-50 text-red-900",
                    !failed && last && phase === "running" && "border-foreground",
                    !failed && !(last && phase === "running") && "border-border bg-muted/30"
                  )}
                >
                  <span className="font-medium">
                    {STEP_LABEL[s.step] ?? s.step}
                  </span>
                  {s.detail ? (
                    <span className="hidden max-w-[10rem] truncate text-muted-foreground sm:inline">
                      {s.detail}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {trace?.rawModelResponse ? (
        <details className="border border-border text-sm">
          <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
            Roh-Antwort Modell (mit Platzhaltern)
          </summary>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap border-t border-border p-3 font-mono text-xs leading-relaxed">
            {trace.rawModelResponse}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
