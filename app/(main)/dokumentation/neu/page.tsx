import { DocForm } from "@/components/docs/doc-form";
import { getRootDocPages } from "@/lib/docs/storage";

export const dynamic = "force-dynamic";

export default async function NewDocPage() {
  const rootPages = await getRootDocPages();

  return <DocForm mode="create" rootPages={rootPages} />;
}
