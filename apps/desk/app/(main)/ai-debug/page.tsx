import { redirect } from "next/navigation";

import { AiDebugLab } from "@/components/ai/ai-debug-lab";
import { AiDebugJobsCompact } from "@/components/ai/ai-debug-jobs-compact";
import {
  requireDeskUser,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import {
  consentStatusView,
  getLatestAiConsent,
} from "@/lib/ai/consent";
import { isAiDebugEnabled } from "@/lib/ai/debug";
import { userCanAccessAiDebug } from "@/lib/ai/debug-access";
import { listAiDebugJobs } from "@/lib/platform/ai-debug-storage";
import { hrefFor } from "@/lib/area/paths";
import { getMatters } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";

export default async function DeskAiDebugPage() {
  const ctx = await requireDeskUser();

  if (!(await userCanAccessAiDebug({ tenantId: ctx.tenantId }))) {
    redirect("/dashboard");
  }

  const debugEnabled = isAiDebugEnabled();
  const matters = await getMatters(ctx.tenantId, ctx.area);
  const withConsent = await Promise.all(
    matters.map(async (matter) => {
      const latest = await getLatestAiConsent(ctx.tenantId, matter.clientId);
      return {
        ...matter,
        consentGranted: consentStatusView(latest) === "granted",
      };
    })
  );

  const jobs = debugEnabled
    ? await listAiDebugJobs({ limit: 12, tenantId: ctx.tenantId })
    : [];

  return (
    <DeskAppShell ctx={ctx} headerTitle="KI-Debug">
      <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-4 lg:p-6">
        <AiDebugLab
          matters={withConsent}
          debugEnabled={debugEnabled}
          mattersHref={hrefFor("matters", ctx.area)}
        />

        {debugEnabled && jobs.length > 0 ? (
          <AiDebugJobsCompact jobs={jobs} />
        ) : null}
      </div>
    </DeskAppShell>
  );
}
