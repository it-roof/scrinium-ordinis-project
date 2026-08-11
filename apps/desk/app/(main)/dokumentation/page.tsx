import { DocsShell } from "@/components/docs/docs-shell";
import { getDocPageTree } from "@/lib/docs/storage";

export const dynamic = "force-dynamic";

export default async function DokumentationPage() {
  const tree = await getDocPageTree();

  return <DocsShell tree={tree} />;
}
