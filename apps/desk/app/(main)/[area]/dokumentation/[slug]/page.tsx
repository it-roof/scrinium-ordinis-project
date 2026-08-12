import { redirect } from "next/navigation";

import { requireAreaFunction } from "@/lib/area/require-function";
import { areaBasePath } from "@/lib/area/paths";

type PageProps = {
  params: Promise<{ area: string; slug: string }>;
};

/** Alte Deep-Links → Listenansicht (Auswahl nur noch per UI-State). */
export default async function AreaDocSlugRedirect({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const { area } = await requireAreaFunction(areaSlug, "docs");
  redirect(`${areaBasePath(area)}/dokumentation`);
}
