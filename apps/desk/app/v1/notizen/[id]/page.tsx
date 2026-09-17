import { notFound } from "next/navigation";

import { V1NotesWorkspace } from "@/components/v1/notes/notes-workspace";
import {
  requireV1DeskUser,
  V1AppShell,
} from "@/components/v1/shell/v1-app-shell";
import { getUserNoteById, listUserNotes } from "@/lib/notes/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function V1NotizPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await requireV1DeskUser({ requireFunction: "notes" });

  const [items, note] = await Promise.all([
    listUserNotes(ctx.tenantId, ctx.userId),
    getUserNoteById(ctx.tenantId, ctx.userId, id),
  ]);

  if (!note) {
    notFound();
  }

  return (
    <V1AppShell ctx={ctx} headerTitle="Notiz">
      <V1NotesWorkspace
        initialItems={items}
        selectedId={note.id}
        mode="view"
      />
    </V1AppShell>
  );
}
