import { notFound } from "next/navigation";

import { V1NoteForm } from "@/components/desk/notes/note-form";
import {
  requireDeskUser,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { getUserNoteById } from "@/lib/notes/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function V1NotizBearbeitenPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await requireDeskUser({ requireFunction: "notes" });
  const note = await getUserNoteById(ctx.tenantId, ctx.userId, id);

  if (!note) {
    notFound();
  }

  return (
    <DeskAppShell ctx={ctx} headerTitle="Notiz bearbeiten">
      <V1NoteForm mode="edit" initial={note} />
    </DeskAppShell>
  );
}
