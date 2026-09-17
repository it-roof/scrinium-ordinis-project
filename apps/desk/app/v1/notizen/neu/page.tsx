import { V1NotesWorkspace } from "@/components/v1/notes/notes-workspace";
import {
  requireV1DeskUser,
  V1AppShell,
} from "@/components/v1/shell/v1-app-shell";
import { listUserNotes } from "@/lib/notes/storage";

export const dynamic = "force-dynamic";

export default async function V1NeueNotizPage() {
  const ctx = await requireV1DeskUser({ requireFunction: "notes" });
  const items = await listUserNotes(ctx.tenantId, ctx.userId);

  return (
    <V1AppShell ctx={ctx} headerTitle="Neue Notiz">
      <V1NotesWorkspace initialItems={items} mode="new" />
    </V1AppShell>
  );
}
