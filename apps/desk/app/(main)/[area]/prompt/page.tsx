import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaPromptRedirect({ params }: PageProps) {
  await params;
  redirect("/v1/prompt");
}
