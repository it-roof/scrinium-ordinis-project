export type UserNoteFile = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type UserNote = {
  id: string;
  title: string;
  body: string;
  files: UserNoteFile[];
  createdAt: string;
  updatedAt: string;
};

export type UserNoteInput = {
  title: string;
  body: string;
};

export type UserNoteUploadedFile = {
  id: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export const MAX_NOTE_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_FILES_PER_NOTE = 5;

export function validateNoteFileMeta(
  filename: string,
  sizeBytes: number
): string | null {
  if (!filename.trim()) {
    return "Dateiname fehlt.";
  }
  if (sizeBytes <= 0) {
    return "Leere Dateien sind nicht erlaubt.";
  }
  if (sizeBytes > MAX_NOTE_FILE_BYTES) {
    return "Dateien dürfen maximal 50 MB groß sein.";
  }
  return null;
}

export function validateNoteFile(file: File): string | null {
  return validateNoteFileMeta(file.name, file.size);
}
