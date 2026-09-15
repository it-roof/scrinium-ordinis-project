import { redirect } from "next/navigation";

export default function LegacySchreibenNeuRedirect() {
  redirect("/v1/dashboard");
}
