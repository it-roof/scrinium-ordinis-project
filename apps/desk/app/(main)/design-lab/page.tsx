import { redirect } from "next/navigation";

/** Legacy: Design liegt unter /neues-design (v1 wird abgelöst). */
export default function DesignLabLegacyRedirect() {
  redirect("/neues-design/alba-manrope");
}
