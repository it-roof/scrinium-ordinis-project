import { notFound } from "next/navigation";

import { V1NotesWorkspace } from "@/components/desk/notes/notes-workspace";
import {
  requireDeskUser,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { getUserNoteById, listUserNotes } from "@/lib/notes/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function V1NotizPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await requireDeskUser({ requireFunction: "notes" });

  const [items, note] = await Promise.all([
    listUserNotes(ctx.tenantId, ctx.userId),
    getUserNoteById(ctx.tenantId, ctx.userId, id),
  ]);

  if (!note) {
    notFound();
  }

  return (
    <DeskAppShell ctx={ctx} headerTitle="Notiz">
      <V1NotesWorkspace
        initialItems={items}
        selectedId={note.id}
        mode="view"
      />
    </DeskAppShell>
  );
}
