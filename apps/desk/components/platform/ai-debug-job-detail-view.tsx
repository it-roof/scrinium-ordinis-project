import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import type { AiDebugJobDetail } from "@/lib/platform/ai-debug-storage";

const STATUS_LABEL: Record<string, string> = {
  pending: "Wartend",
  running: "Läuft",
  succeeded: "OK",
  failed: "Fehler",
};

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AiDebugJobDetailView({
  job,
  listHref = "/ai-debug",
}: {
  job: AiDebugJobDetail;
  listHref?: string;
}) {
  const trace = job.debugTrace;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <PageHeader
        title="KI-Job"
        description={`${job.tenantName} · ${STATUS_LABEL[job.status] ?? job.status}`}
      >
        <Link
          href={listHref}
          className="text-sm font-medium text-sky-700 hover:underline"
        >
          ← Alle Jobs
        </Link>
      </PageHeader>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Job-ID</dt>
          <dd className="font-mono text-xs break-all">{job.id}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Task</dt>
          <dd className="font-mono text-xs">{job.task}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Erstellt</dt>
          <dd className="tabular-nums">{formatWhen(job.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Fehler</dt>
          <dd className="font-mono text-xs text-red-700">
            {job.errorCode ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Akte / Mandant</dt>
          <dd className="font-mono text-xs break-all">
            {job.matterId} / {job.clientId}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Vorschau bestätigt</dt>
          <dd>{job.previewConfirmed ? "ja" : "nein"}</dd>
        </div>
      </dl>

      {!trace ? (
        <p className="text-sm text-muted-foreground">
          Kein Debug-Trace. Job lief ohne{" "}
          <code className="font-mono text-xs">AI_DEBUG=1</code>, oder Trace
          fehlt.
        </p>
      ) : (
        <>
          {(trace.model ||
            trace.inputTokens != null ||
            trace.latencyMs != null) && (
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {trace.model ? (
                <span>
                  Modell:{" "}
                  <code className="font-mono text-xs text-foreground">
                    {trace.model}
                  </code>
                </span>
              ) : null}
              {trace.inputTokens != null ? (
                <span className="tabular-nums">
                  Tokens: {trace.inputTokens} → {trace.outputTokens ?? "?"}
                </span>
              ) : null}
              {trace.latencyMs != null ? (
                <span className="tabular-nums">{trace.latencyMs} ms</span>
              ) : null}
              {trace.placeholderCount != null ? (
                <span className="tabular-nums">
                  Platzhalter: {trace.placeholderCount}
                </span>
              ) : null}
            </div>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
              Timeline
            </h2>
            <ol className="border-l border-border pl-4">
              {trace.steps.map((s, i) => (
                <li key={`${s.at}-${i}`} className="relative mb-4 last:mb-0">
                  <span className="absolute -left-[1.15rem] top-1.5 size-2 rounded-full bg-foreground/40" />
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {formatWhen(s.at)}
                  </div>
                  <div className="font-mono text-sm">{s.step}</div>
                  {s.detail ? (
                    <div className="text-sm text-muted-foreground">
                      {s.detail}
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          {trace.pseudonymizedUserMessage ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                Pseudonymisierte User-Message
              </h2>
              <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed">
                {trace.pseudonymizedUserMessage}
              </pre>
            </section>
          ) : null}

          {trace.rawModelResponse ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                Roh-Antwort Modell (Platzhalter)
              </h2>
              <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed">
                {trace.rawModelResponse}
              </pre>
            </section>
          ) : null}

          {trace.unknownPlaceholders &&
          trace.unknownPlaceholders.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                Unbekannte Platzhalter
              </h2>
              <ul className="font-mono text-xs">
                {trace.unknownPlaceholders.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
