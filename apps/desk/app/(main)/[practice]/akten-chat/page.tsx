import { AktenChatMatterPicker } from "@/components/ai/akten-chat-matter-picker";
import {
  requireDeskPractice,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import {
  consentStatusView,
  getLatestAiConsent,
} from "@/lib/ai/consent";
import { practiceBasePath } from "@/lib/area/paths";
import { getMatters } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ practice: string }>;
};

export default async function AktenChatIndexPage({ params }: PageProps) {
  const { practice: practiceSlug } = await params;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "akten-chat",
  });
  const matters = await getMatters(ctx.tenantId, ctx.area);
  const basePath = practiceBasePath(ctx.area);

  const withConsent = await Promise.all(
    matters.map(async (matter) => {
      const latest = await getLatestAiConsent(ctx.tenantId, matter.clientId);
      return {
        ...matter,
        consentGranted: consentStatusView(latest) === "granted",
      };
    })
  );

  return (
    <DeskAppShell ctx={ctx} headerTitle="Akten-Chat">
      <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-4 lg:p-6">
        <div className="space-y-2">
          <p className="b-eyebrow">KI</p>
          <h1 className="b-title">Akten-Chat</h1>
          <p className="b-lead">
            Akte wählen — Chats hängen an der Akte und bleiben gespeichert.
          </p>
        </div>
        <AktenChatMatterPicker matters={withConsent} basePath={basePath} />
      </div>
    </DeskAppShell>
  );
}
