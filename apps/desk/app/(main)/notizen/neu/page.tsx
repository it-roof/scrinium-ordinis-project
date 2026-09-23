import { V1NotesWorkspace } from "@/components/desk/notes/notes-workspace";
import {
  requireDeskUser,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { listUserNotes } from "@/lib/notes/storage";

export const dynamic = "force-dynamic";

export default async function V1NeueNotizPage() {
  const ctx = await requireDeskUser({ requireFunction: "notes" });
  const items = await listUserNotes(ctx.tenantId, ctx.userId);

  return (
    <DeskAppShell ctx={ctx} headerTitle="Neue Notiz">
      <V1NotesWorkspace initialItems={items} mode="new" />
    </DeskAppShell>
  );
}
