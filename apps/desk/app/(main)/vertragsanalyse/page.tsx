import { ContractAnalysisView } from "@/components/ai/contract-analysis-view";
import {
  requireDeskUser,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function ContractAnalysisPage() {
  const ctx = await requireDeskUser({ requireFunction: "contract-analysis" });

  return (
    <DeskAppShell ctx={ctx} headerTitle="Vertragsanalyse">
      <ContractAnalysisView />
    </DeskAppShell>
  );
}
