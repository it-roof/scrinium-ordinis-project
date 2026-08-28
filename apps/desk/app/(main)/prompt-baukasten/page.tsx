import { redirectLegacyFunction } from "@/lib/area/require-function";

export default async function LegacyPromptKitPage() {
  await redirectLegacyFunction("prompt-kit", "/prompt-baukasten");
}
