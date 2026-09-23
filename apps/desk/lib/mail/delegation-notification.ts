import { hrefFor } from "@/lib/area/paths";
import { getAppBaseUrl, sendSystemMail } from "@/lib/mail/system";

function inboxUrl(): string {
  return `${getAppBaseUrl()}${hrefFor("inbox")}`;
}

export async function sendDelegationAssignmentMail(input: {
  to: string;
  assigneeName: string;
  assignerName: string;
  letterTitle: string;
  module: string;
  assignmentNote?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  void input.module;
  const link = inboxUrl();
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
    "Unter Meine Aufgaben findest du die Aufgabe:",
    link,
    "",
    "Scrinium Ordinis"
  );

  return sendSystemMail({
    to: input.to,
    subject: "Scrinium Ordinis — Neue Aufgabe",
    text: lines.join("\n"),
  });
}
