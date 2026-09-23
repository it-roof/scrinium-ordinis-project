"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BugIcon, ChevronRightIcon } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { AiDebugJobListItem } from "@/lib/platform/ai-debug-storage";

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

export function AiDebugJobsView({
  jobs,
  debugEnabled,
  backHref = "/dashboard",
  backLabel = "← Dashboard",
}: {
  jobs: AiDebugJobListItem[];
  debugEnabled: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <PageHeader
        title="KI-Debug"
        description="Pipeline der letzten Jobs — nur Test-Kanzlei · AI_DEBUG."
      >
        <Link
          href={backHref}
          className="text-sm font-medium text-sky-700 hover:underline"
        >
          {backLabel}
        </Link>
      </PageHeader>

      {!debugEnabled ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BugIcon />
            </EmptyMedia>
            <EmptyTitle>AI_DEBUG ist aus</EmptyTitle>
            <EmptyDescription>
              Setze <code className="font-mono text-xs">AI_DEBUG=1</code> in der
              Env und starte den Server neu. Ohne Flag werden keine Timelines
              gespeichert.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : jobs.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BugIcon />
            </EmptyMedia>
            <EmptyTitle>Noch keine KI-Jobs</EmptyTitle>
            <EmptyDescription>
              Starte eine Analyse in einer Test-Kanzlei — danach erscheint der
              Job hier.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="surface-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/70 bg-muted/40 text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Zeit</th>
                <th className="px-4 py-3 font-medium">Kanzlei</th>
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Trace</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Öffnen</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/30"
                  onClick={() => router.push(`/ai-debug/${job.id}`)}
                >
                  <td className="px-4 py-3 text-muted-foreground tabular-nums whitespace-nowrap">
                    {formatWhen(job.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-medium">{job.tenantName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {job.task}
                  </td>
                  <td className="px-4 py-3">
                    {STATUS_LABEL[job.status] ?? job.status}
                    {job.errorCode ? (
                      <span className="ml-2 font-mono text-xs text-red-700">
                        {job.errorCode}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {job.hasDebugTrace ? "ja" : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/ai-debug/${job.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:underline"
                    >
                      Öffnen
                      <ChevronRightIcon className="size-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
