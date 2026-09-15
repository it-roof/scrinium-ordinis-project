import { redirect } from "next/navigation";

export default function LegacyPromptRedirect() {
  redirect("/v1/prompt");
}
