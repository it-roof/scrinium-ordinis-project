import { renderPromptKitFlowPage } from "@/lib/prompt-kit/render-flow-page";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function ComposeEmailPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  return renderPromptKitFlowPage({
    areaSlug,
    functionId: "compose-email",
    initialFlow: "email",
  });
}
