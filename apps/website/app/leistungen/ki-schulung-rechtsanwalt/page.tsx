import { redirect } from "next/navigation";

/** Legacy-Pfad → kanonische Conversion-Landingpage */
export default function KiSchulungLegacyRedirect() {
  redirect("/ki-schulung-rechtsanwalt");
}
