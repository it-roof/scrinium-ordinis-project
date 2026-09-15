import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ area: string }>;
};

/** Nachrichten-Verlauf entfällt — Weiterleitung zu Meine Aufgaben. */
export default async function AreaInboxOverviewRedirect({ params }: PageProps) {
  await params;
  redirect("/v1/eingang");
}
