import { notFound } from "next/navigation";

import { LetterForm } from "@/components/letters/letter-form";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getLetterById, listLetterColleagues } from "@/lib/letters/storage";
import { listMattersOptions } from "@/lib/matters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string; id: string }>;
  searchParams: Promise<{ delegieren?: string }>;
};

export default async function AreaLetterEditPage({
  params,
  searchParams,
}: PageProps) {
  const { area: areaSlug, id } = await params;
  const query = await searchParams;
  const { user } = await requireAreaFunction(areaSlug, "letters");
  const [letter, colleagues, matters] = await Promise.all([
    getLetterById(user.tenantId, id),
    listLetterColleagues(user.tenantId),
    listMattersOptions(user.tenantId, "legal"),
  ]);
  if (!letter) {
    notFound();
  }

  return (
    <LetterForm
      mode="edit"
      letterId={letter.id}
      initialValues={letter}
      colleagues={colleagues}
      currentUserId={user.id}
      matters={matters}
      openDelegateFork={query.delegieren === "1"}
    />
  );
}
