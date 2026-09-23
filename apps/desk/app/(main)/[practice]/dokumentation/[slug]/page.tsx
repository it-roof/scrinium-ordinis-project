import { redirect } from "next/navigation";

import { requireDeskPractice } from "@/components/desk/shell/desk-app-shell";
import { hrefFor } from "@/lib/area/paths";

type PageProps = {
  params: Promise<{ practice: string; slug: string }>;
};

/** Alte Deep-Links → Listenansicht. */
export default async function DeskDocSlugRedirect({ params }: PageProps) {
  const { practice: practiceSlug } = await params;
  const ctx = await requireDeskPractice(practiceSlug, {
    requireFunction: "docs",
  });
  redirect(hrefFor("docs", ctx.area));
}
