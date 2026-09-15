import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ area: string; id: string }>;
};

export default async function AreaSchreibenEditRedirect({ params }: PageProps) {
  await params;
  redirect("/v1/dashboard");
}
