import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaTextBlocksRedirect({ params }: PageProps) {
  await params;
  redirect("/v1/textbausteine");
}
