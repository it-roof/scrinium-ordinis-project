import { redirectLegacyFunction } from "@/lib/area/require-function";

export const dynamic = "force-dynamic";

export default async function LegacyTextBlocksRedirect() {
  await redirectLegacyFunction("text-blocks", "/textbausteine");
}
