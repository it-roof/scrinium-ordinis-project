import { renderPromptKitFlowPage } from "@/lib/prompt-kit/render-flow-page";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
  searchParams: Promise<{ flow?: string }>;
};

export default async function AreaPromptKitPage({
  params,
  searchParams,
}: PageProps) {
  const { area: areaSlug } = await params;
  const query = await searchParams;
  const flow =
    query.flow === "letter" || query.flow === "email" || query.flow === "print"
      ? query.flow
      : null;

  return renderPromptKitFlowPage({
    areaSlug,
    functionId: "prompt-kit",
    initialFlow: flow,
  });
}
