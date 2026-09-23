"use client";

import Link from "next/link";

import type { AiDebugJobListItem } from "@/lib/platform/ai-debug-storage";

const STATUS_LABEL: Record<string, string> = {
  pending: "wartet",
  running: "läuft",
  succeeded: "ok",
  failed: "fehler",
};

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Compact job history under the debug lab — no second page header. */
export function AiDebugJobsCompact({ jobs }: { jobs: AiDebugJobListItem[] }) {
  return (
    <details className="border border-border text-sm">
      <summary className="cursor-pointer px-3 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground">
        Letzte Jobs ({jobs.length})
      </summary>
      <ul className="divide-y divide-border border-t border-border">
        {jobs.map((job) => (
          <li key={job.id}>
            <Link
              href={`/ai-debug/${job.id}`}
              className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/40"
            >
              <span className="tabular-nums text-muted-foreground">
                {formatWhen(job.createdAt)}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {job.task}
              </span>
              <span className="text-xs">
                {STATUS_LABEL[job.status] ?? job.status}
                {job.errorCode ? (
                  <span className="ml-1 text-red-700">{job.errorCode}</span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
