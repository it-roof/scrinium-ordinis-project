import { redirectLegacyFunction } from "@/lib/area/require-function";

export default async function LegacyStaffMessagesPage() {
  await redirectLegacyFunction("staff-messages", "/nachrichten-an-mitarbeiter");
}
