import { redirect } from "next/navigation";

import { ProductKiCatalogView } from "@/components/ai/product-ki-catalog-view";
import {
  requireDeskUser,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { userCanAccessAiDebug } from "@/lib/ai/debug-access";
import {
  getProductActionCatalog,
  getProductPromptCatalog,
} from "@/lib/ai/product-prompt-catalog";

export const dynamic = "force-dynamic";

export default async function ProductKiCatalogPage() {
  const ctx = await requireDeskUser();

  if (!(await userCanAccessAiDebug({ tenantId: ctx.tenantId }))) {
    redirect("/dashboard");
  }

  const prompts = getProductPromptCatalog();
  const actions = getProductActionCatalog();

  return (
    <DeskAppShell ctx={ctx} headerTitle="Produkt-KI">
      <ProductKiCatalogView prompts={prompts} actions={actions} />
    </DeskAppShell>
  );
}
