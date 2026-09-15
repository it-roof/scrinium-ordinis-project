import { redirect } from "next/navigation";

export default function LegacyStaffMessagesRedirect() {
  redirect("/v1/zuweisen");
}
