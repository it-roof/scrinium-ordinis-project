import { redirect } from "next/navigation";

import { requireDeskPractice } from "@/components/desk/shell/desk-app-shell";
import { createMatterAiChat } from "@/lib/ai/matter-chat/storage";
import { aktenChatHref } from "@/lib/ai/matter-chat/paths";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ practice: string }>;
};

/** Sidebar: immer einen neuen Chat ohne Akte starten. */
export default async function AktenChatIndexPage({ params }: PageProps) {
  const { practice: practiceSlug } = await params;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "akten-chat",
  });

  const created = await createMatterAiChat({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    matterId: null,
    module: ctx.area,
  });
  if (!created) {
    redirect(aktenChatHref(ctx.area, null));
  }

  redirect(aktenChatHref(ctx.area, null, created.id));
}
