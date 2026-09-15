import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaClientsRedirect({ params }: PageProps) {
  await params;
  redirect("/v1/mandanten");
}
