import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LegacyPromptEditRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/v1/prompt/${id}/bearbeiten`);
}
