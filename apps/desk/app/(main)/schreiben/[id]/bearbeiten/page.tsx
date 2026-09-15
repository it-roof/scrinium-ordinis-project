import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LegacySchreibenEditRedirect({ params }: PageProps) {
  await params;
  redirect("/v1/dashboard");
}
