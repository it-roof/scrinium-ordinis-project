import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaPromptVerwaltenRedirect({ params }: PageProps) {
  await params;
  redirect("/v1/prompt");
}
