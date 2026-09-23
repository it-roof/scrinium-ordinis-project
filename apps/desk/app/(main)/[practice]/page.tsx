import { notFound, redirect } from "next/navigation";

import { isDeskRoleId } from "@/lib/area/desk-roles";
import { practiceFromSlug, slugForPractice } from "@/lib/area/paths";
import { auth } from "@/lib/auth";
import { getUserDeskRole } from "@/lib/tenant/modules";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ practice: string }>;
};

/**
 * Bare Practice-URL (`/r`, `/s`, `/n`): kein eigener Start mehr.
 * Desk-Rolle → Dashboard; sonst → Root-Hinweis.
 */
export default async function PracticeIndexRedirect({ params }: PageProps) {
  const { practice: practiceSlug } = await params;
  const practice = practiceFromSlug(practiceSlug);
  if (!practice || slugForPractice(practice) !== practiceSlug) {
    notFound();
  }

  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const deskRole = await getUserDeskRole(
    session.user.id,
    session.user.tenantId
  );

  if (deskRole && isDeskRoleId(deskRole)) {
    redirect("/dashboard");
  }

  redirect("/");
}
