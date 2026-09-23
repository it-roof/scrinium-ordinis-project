import { V1NoteForm } from "@/components/desk/notes/note-form";
import {
  requireDeskUser,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";

export const dynamic = "force-dynamic";

export default async function V1NeueNotizPage() {
  const ctx = await requireDeskUser({ requireFunction: "notes" });

  return (
    <DeskAppShell ctx={ctx} headerTitle="Neue Notiz">
      <V1NoteForm mode="create" />
    </DeskAppShell>
  );
}
