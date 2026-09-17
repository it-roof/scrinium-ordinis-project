import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { userNoteFiles, userNotes } from "@/lib/db/schema";
import { sanitizeFilename } from "@/lib/docs/upload-policy";
import { deleteObject } from "@/lib/storage/s3";
import { withTenantUserDb } from "@/lib/tenant/db";

import type {
  UserNote,
  UserNoteFile,
  UserNoteInput,
  UserNoteUploadedFile,
} from "./types";
import { MAX_FILES_PER_NOTE } from "./types";

type NoteRow = typeof userNotes.$inferSelect;
type FileRow = typeof userNoteFiles.$inferSelect;
type TenantTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function toFile(row: FileRow): UserNoteFile {
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
  };
}

function toNote(row: NoteRow, files: UserNoteFile[] = []): UserNote {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    files,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function loadFilesForNotes(
  tx: TenantTx,
  tenantId: string,
  noteIds: string[]
): Promise<Map<string, UserNoteFile[]>> {
  const map = new Map<string, UserNoteFile[]>();
  if (noteIds.length === 0) return map;

  const rows = await tx
    .select()
    .from(userNoteFiles)
    .where(
      and(
        eq(userNoteFiles.tenantId, tenantId),
        inArray(userNoteFiles.noteId, noteIds)
      )
    )
    .orderBy(asc(userNoteFiles.createdAt));

  for (const row of rows) {
    const list = map.get(row.noteId) ?? [];
    list.push(toFile(row));
    map.set(row.noteId, list);
  }
  return map;
}

export function userNoteObjectKey(
  tenantId: string,
  noteId: string,
  fileId: string,
  filename: string
): string {
  return `tenants/${tenantId}/notes/${noteId}/${fileId}-${sanitizeFilename(filename)}`;
}

export async function discardUserNoteObjects(
  storageKeys: string[]
): Promise<void> {
  await Promise.all(
    storageKeys.map(async (key) => {
      try {
        await deleteObject(key);
      } catch {
        // best effort
      }
    })
  );
}

export async function listUserNotes(
  tenantId: string,
  userId: string
): Promise<UserNote[]> {
  return withTenantUserDb(tenantId, userId, async (tx) => {
    const rows = await tx
      .select()
      .from(userNotes)
      .where(
        and(eq(userNotes.tenantId, tenantId), eq(userNotes.userId, userId))
      )
      .orderBy(desc(userNotes.updatedAt));

    const filesByNote = await loadFilesForNotes(
      tx,
      tenantId,
      rows.map((row) => row.id)
    );

    return rows.map((row) => toNote(row, filesByNote.get(row.id) ?? []));
  });
}

export async function getUserNoteById(
  tenantId: string,
  userId: string,
  id: string
): Promise<UserNote | null> {
  return withTenantUserDb(tenantId, userId, async (tx) => {
    const [row] = await tx
      .select()
      .from(userNotes)
      .where(
        and(
          eq(userNotes.id, id),
          eq(userNotes.tenantId, tenantId),
          eq(userNotes.userId, userId)
        )
      )
      .limit(1);

    if (!row) return null;

    const filesByNote = await loadFilesForNotes(tx, tenantId, [row.id]);
    return toNote(row, filesByNote.get(row.id) ?? []);
  });
}

export async function createUserNoteRow(
  tenantId: string,
  userId: string,
  input: UserNoteInput,
  files: UserNoteUploadedFile[] = [],
  noteId = crypto.randomUUID()
): Promise<UserNote | { error: string }> {
  if (files.length > MAX_FILES_PER_NOTE) {
    return { error: `Maximal ${MAX_FILES_PER_NOTE} Dateien.` };
  }

  return withTenantUserDb(tenantId, userId, async (tx) => {
    const [row] = await tx
      .insert(userNotes)
      .values({
        id: noteId,
        tenantId,
        userId,
        title: input.title.trim(),
        body: input.body.trim(),
      })
      .returning();

    if (files.length > 0) {
      await tx.insert(userNoteFiles).values(
        files.map((file) => ({
          id: file.id,
          tenantId,
          noteId: row.id,
          userId,
          storageKey: file.storageKey,
          filename: file.filename,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
        }))
      );
    }

    return toNote(
      row,
      files.map((file) => ({
        id: file.id,
        filename: file.filename,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        createdAt: row.createdAt,
      }))
    );
  });
}

export async function updateUserNoteRow(
  tenantId: string,
  userId: string,
  id: string,
  input: UserNoteInput,
  newFiles: UserNoteUploadedFile[] = []
): Promise<UserNote | null | { error: string }> {
  return withTenantUserDb(tenantId, userId, async (tx) => {
    const existingFiles = await tx
      .select({ id: userNoteFiles.id })
      .from(userNoteFiles)
      .where(
        and(
          eq(userNoteFiles.tenantId, tenantId),
          eq(userNoteFiles.noteId, id),
          eq(userNoteFiles.userId, userId)
        )
      );

    if (existingFiles.length + newFiles.length > MAX_FILES_PER_NOTE) {
      return {
        error: `Maximal ${MAX_FILES_PER_NOTE} Dateien pro Notiz.`,
      };
    }

    const [row] = await tx
      .update(userNotes)
      .set({
        title: input.title.trim(),
        body: input.body.trim(),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(userNotes.id, id),
          eq(userNotes.tenantId, tenantId),
          eq(userNotes.userId, userId)
        )
      )
      .returning();

    if (!row) return null;

    if (newFiles.length > 0) {
      await tx.insert(userNoteFiles).values(
        newFiles.map((file) => ({
          id: file.id,
          tenantId,
          noteId: row.id,
          userId,
          storageKey: file.storageKey,
          filename: file.filename,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
        }))
      );
    }

    const filesByNote = await loadFilesForNotes(tx, tenantId, [row.id]);
    return toNote(row, filesByNote.get(row.id) ?? []);
  });
}

export async function deleteUserNoteRow(
  tenantId: string,
  userId: string,
  id: string
): Promise<{ deleted: boolean; storageKeys: string[] }> {
  return withTenantUserDb(tenantId, userId, async (tx) => {
    const fileRows = await tx
      .select({ storageKey: userNoteFiles.storageKey })
      .from(userNoteFiles)
      .where(
        and(
          eq(userNoteFiles.tenantId, tenantId),
          eq(userNoteFiles.noteId, id),
          eq(userNoteFiles.userId, userId)
        )
      );

    const deleted = await tx
      .delete(userNotes)
      .where(
        and(
          eq(userNotes.id, id),
          eq(userNotes.tenantId, tenantId),
          eq(userNotes.userId, userId)
        )
      )
      .returning({ id: userNotes.id });

    return {
      deleted: deleted.length > 0,
      storageKeys: fileRows.map((row) => row.storageKey),
    };
  });
}

export async function getUserNoteFileById(
  tenantId: string,
  userId: string,
  fileId: string
): Promise<{
  id: string;
  noteId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
} | null> {
  return withTenantUserDb(tenantId, userId, async (tx) => {
    const [row] = await tx
      .select({
        id: userNoteFiles.id,
        noteId: userNoteFiles.noteId,
        storageKey: userNoteFiles.storageKey,
        filename: userNoteFiles.filename,
        mimeType: userNoteFiles.mimeType,
      })
      .from(userNoteFiles)
      .where(
        and(
          eq(userNoteFiles.id, fileId),
          eq(userNoteFiles.tenantId, tenantId),
          eq(userNoteFiles.userId, userId)
        )
      )
      .limit(1);

    return row ?? null;
  });
}

export async function removeUserNoteFileRow(
  tenantId: string,
  userId: string,
  noteId: string,
  fileId: string
): Promise<{ storageKey: string } | null> {
  return withTenantUserDb(tenantId, userId, async (tx) => {
    const [removed] = await tx
      .delete(userNoteFiles)
      .where(
        and(
          eq(userNoteFiles.id, fileId),
          eq(userNoteFiles.noteId, noteId),
          eq(userNoteFiles.tenantId, tenantId),
          eq(userNoteFiles.userId, userId)
        )
      )
      .returning({ storageKey: userNoteFiles.storageKey });

    if (!removed) return null;

    await tx
      .update(userNotes)
      .set({ updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(userNotes.id, noteId),
          eq(userNotes.tenantId, tenantId),
          eq(userNotes.userId, userId)
        )
      );

    return removed;
  });
}
