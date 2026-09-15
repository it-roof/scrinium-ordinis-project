import { notFound } from "next/navigation";

import { MatterDetailView } from "@/components/matters/matter-detail-view";
import {
  requireV1DeskUser,
  V1AppShell,
} from "@/components/v1/shell/v1-app-shell";
import { getMatterById } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function V1MatterDetailPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await requireV1DeskUser({ requireFunction: "matters" });
  const matter = await getMatterById(ctx.tenantId, id);
  if (!matter) {
    notFound();
  }

  return (
    <V1AppShell ctx={ctx} headerTitle="Akte">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <MatterDetailView matter={matter} letters={[]} showLetters={false} />
      </div>
    </V1AppShell>
  );
}
