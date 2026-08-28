import { redirectLegacyFunction } from "@/lib/area/require-function";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LegacyLetterEditRedirect({ params }: PageProps) {
  const { id } = await params;
  await redirectLegacyFunction("letters", `/schreiben/${id}/bearbeiten`);
}
