import { LettersView } from "@/components/letters/letters-view";
import { requireAreaFunction } from "@/lib/area/require-function";
import { getLetters } from "@/lib/letters/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
};

export default async function AreaLettersPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { user } = await requireAreaFunction(areaSlug, "letters");
  const items = await getLetters(user.tenantId, "legal");

  return (
    <LettersView initialItems={items} currentUserId={user.id} />
  );
}
