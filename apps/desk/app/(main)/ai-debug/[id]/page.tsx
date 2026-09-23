import { notFound, redirect } from "next/navigation";

import { AiDebugJobDetailView } from "@/components/platform/ai-debug-job-detail-view";
import {
  requireDeskUser,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { isAiDebugEnabled } from "@/lib/ai/debug";
import { userCanAccessAiDebug } from "@/lib/ai/debug-access";
import { getAiDebugJob } from "@/lib/platform/ai-debug-storage";

export const dynamic = "force-dynamic";

export default async function V1AiDebugDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireDeskUser();

  if (!(await userCanAccessAiDebug({ tenantId: ctx.tenantId }))) {
    redirect("/dashboard");
  }

  if (!isAiDebugEnabled()) {
    notFound();
  }

  const { id } = await params;
  const job = await getAiDebugJob(id, { tenantId: ctx.tenantId });
  if (!job) {
    notFound();
  }

  return (
    <DeskAppShell ctx={ctx} headerTitle="KI-Job">
      <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-4 lg:p-6">
        <AiDebugJobDetailView job={job} listHref="/ai-debug" />
      </div>
    </DeskAppShell>
  );
}
