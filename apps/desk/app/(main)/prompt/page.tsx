import { redirectLegacyFunction } from "@/lib/area/require-function";

export const dynamic = "force-dynamic";

export default async function LegacyPromptRedirect() {
  await redirectLegacyFunction("prompts", "/prompt");
}
