import { redirect } from "next/navigation";

import { requireAreaFunction } from "@/lib/area/require-function";
import { areaBasePath } from "@/lib/area/paths";

type PageProps = {
  params: Promise<{ area: string; slug: string }>;
};

/** Alte Bearbeiten-URLs → Listenansicht. */
export default async function AreaEditDocRedirect({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { area } = await requireAreaFunction(areaSlug, "docs");
  redirect(`${areaBasePath(area)}/dokumentation`);
}
