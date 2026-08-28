import { LetterForm } from "@/components/letters/letter-form";
import { requireAreaFunction } from "@/lib/area/require-function";
import { listLetterColleagues } from "@/lib/letters/storage";
import { isLetterKind } from "@/lib/letters/types";
import { listMattersOptions } from "@/lib/matters/storage";
import { formatSmtpSenderDisplay } from "@/lib/smtp/display";
import { getUserSmtpSettingsPublic } from "@/lib/smtp/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ area: string }>;
  searchParams: Promise<{ kind?: string; title?: string; matter?: string }>;
};

export default async function AreaLetterCreatePage({
  params,
  searchParams,
}: PageProps) {
  const { area: areaSlug } = await params;
  const query = await searchParams;
  const { user } = await requireAreaFunction(areaSlug, "letters");

  const kindParam = query.kind ?? "";
  const defaultKind = isLetterKind(kindParam) ? kindParam : undefined;
  const defaultTitle = query.title?.trim() || undefined;
  const defaultMatterId = query.matter?.trim() || undefined;
  const [colleagues, matters, smtp] = await Promise.all([
    listLetterColleagues(user.tenantId),
    listMattersOptions(user.tenantId, "legal"),
    getUserSmtpSettingsPublic(user.tenantId, user.id),
  ]);

  return (
    <LetterForm
      mode="create"
      defaultKind={defaultKind}
      defaultTitle={defaultTitle}
      defaultMatterId={defaultMatterId}
      colleagues={colleagues}
      currentUserId={user.id}
      matters={matters}
      senderFrom={formatSmtpSenderDisplay(smtp)}
    />
  );
}
