import { notFound } from "next/navigation";

import { V1NoteDetailView } from "@/components/desk/notes/note-detail-view";
import {
  requireDeskUser,
  DeskAppShell,
} from "@/components/desk/shell/desk-app-shell";
import { getUserNoteById } from "@/lib/notes/storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function V1NotizPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await requireDeskUser({ requireFunction: "notes" });
  const note = await getUserNoteById(ctx.tenantId, ctx.userId, id);

  if (!note) {
    notFound();
  }

  return (
    <DeskAppShell ctx={ctx} headerTitle="Notiz">
      <V1NoteDetailView note={note} />
    </DeskAppShell>
  );
}
