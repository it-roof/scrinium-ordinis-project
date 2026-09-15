import { redirect } from "next/navigation";

export default function LegacyPromptKitRedirect() {
  redirect("/v1/dashboard");
}
