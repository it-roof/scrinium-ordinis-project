import { functionHref } from "@/lib/area/paths";
import { getAppBaseUrl, sendSystemMail } from "@/lib/mail/system";
import { isAppModuleId, type AppModuleId } from "@/lib/modules";

function inboxUrl(module: string): string {
  const base = getAppBaseUrl();
  if (isAppModuleId(module)) {
    return `${base}${functionHref(module, "inbox")}`;
  }
  return `${base}${functionHref("legal" as AppModuleId, "inbox")}`;
}

export async function sendDelegationAssignmentMail(input: {
  to: string;
  assigneeName: string;
  assignerName: string;
  letterTitle: string;
  module: string;
  assignmentNote?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const link = inboxUrl(input.module);
  const lines = [
    `Hallo ${input.assigneeName},`,
    "",
    `${input.assignerName} hat dir ein Schreiben zur Bearbeitung zugewiesen:`,
    `„${input.letterTitle}"`,
  ];

  if (input.assignmentNote?.trim()) {
    lines.push("", "Anweisung:", input.assignmentNote.trim());
  }

  lines.push(
    "",
    "Im Eingang findest du die Aufgabe:",
    link,
    "",
    "Scrinium Ordinis"
  );

  return sendSystemMail({
    to: input.to,
    subject: "Scrinium Ordinis — Neue Aufgabe im Eingang",
    text: lines.join("\n"),
  });
}
