import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ area: string; id: string }>;
};

export default async function AreaPromptEditRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/v1/prompt/${id}/bearbeiten`);
}
