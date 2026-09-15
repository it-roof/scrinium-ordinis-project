import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ area: string; id: string }>;
};

export default async function AreaClientDetailRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/v1/mandanten/${id}`);
}
