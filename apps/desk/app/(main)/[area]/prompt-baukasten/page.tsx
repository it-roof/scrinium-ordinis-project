import { PromptKitView } from "@/components/prompt-kit/prompt-kit-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getClients } from "@/lib/clients/storage";
import { listLetterColleagues } from "@/lib/letters/storage";
import { listMattersOptions } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaPromptKitPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { user } = await requireAreaFunction(areaSlug, "prompt-kit");
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
    />
  );
}
