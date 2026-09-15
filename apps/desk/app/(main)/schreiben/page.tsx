import { redirect } from "next/navigation";

export default function LegacySchreibenRedirect() {
  redirect("/v1/dashboard");
}
