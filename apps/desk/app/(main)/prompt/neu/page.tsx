import { redirect } from "next/navigation";

export default function LegacyPromptNeuRedirect() {
  redirect("/v1/prompt/neu");
}
