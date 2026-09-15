import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaMattersRedirect({ params }: PageProps) {
  await params;
  redirect("/v1/akten");
}
