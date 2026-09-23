import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ concept: string }>;
};

/** Legacy: einzelne Konzepte → /neues-design */
export default async function DesignLabConceptLegacyRedirect({
  params,
}: PageProps) {
  const { concept } = await params;
  redirect(`/neues-design/${concept}`);
}
