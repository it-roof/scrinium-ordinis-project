import { redirectLegacyFunction } from "@/lib/area/require-function";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LegacyEditDocRedirect({ params }: PageProps) {
  const { slug } = await params;
  await redirectLegacyFunction("docs", `/dokumentation/${slug}/bearbeiten`);
}
