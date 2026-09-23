import { notFound } from "next/navigation";

import {
  DeskAppShell,
  requireDeskUser,
} from "@/components/desk/shell/desk-app-shell";
import { IntakeDetailView } from "@/components/intake/intake-detail-view";
import { getIntakeInviteDetail } from "@/lib/intake/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AufnahmebogenDetailPage({ params }: PageProps) {
  const ctx = await requireDeskUser({ requireFunction: "client-intake" });
  const { id } = await params;
  const detail = await getIntakeInviteDetail(ctx.tenantId, id);
  if (!detail) {
    notFound();
  }

  return (
    <DeskAppShell ctx={ctx} headerTitle="Mandats-Aufnahmebogen">
      <IntakeDetailView detail={detail} />
    </DeskAppShell>
  );
}
