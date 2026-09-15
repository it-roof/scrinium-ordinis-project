import { redirect } from "next/navigation";

export default function LegacyTextBlocksRedirect() {
  redirect("/v1/textbausteine");
}
