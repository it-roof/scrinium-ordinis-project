import {
  PromptKitView,
  type PromptKitInitialFlow,
} from "@/components/prompt-kit/prompt-kit-view";
import type { AreaFunctionId } from "@/lib/area/functions";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getClients } from "@/lib/clients/storage";
import { listLetterColleagues } from "@/lib/letters/storage";
import { listMattersOptions } from "@/lib/matters/storage";

export async function renderPromptKitFlowPage(input: {
  areaSlug: string;
  functionId: AreaFunctionId;
  initialFlow: PromptKitInitialFlow | null;
}) {
  const { user } = await requireAreaFunction(input.areaSlug, input.functionId);
  const [colleagues, clients, matters] = await Promise.all([
    listLetterColleagues(user.tenantId),
    getClients(user.tenantId, "legal"),
    listMattersOptions(user.tenantId, "legal"),
  ]);

  return (
    <PromptKitView
      currentUserId={user.id}
      colleagues={colleagues}
      clients={clients.map((client) => ({ id: client.id, name: client.name }))}
      matters={matters}
      initialFlow={input.initialFlow}
    />
  );
}
