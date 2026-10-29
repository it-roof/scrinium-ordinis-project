export type MatterFileRecord = {
  id: string;
  matterId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
};

export const MAX_MATTER_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_MATTER_FILES_PER_UPLOAD = 10;

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "docx",
  "doc",
  "odt",
  "rtf",
  "txt",
  "png",
  "jpg",
  "jpeg",
  "webp",
]);

export function matterFileExtension(filename: string): string {
  const parts = filename.trim().toLowerCase().split(".");
  return parts.length > 1 ? (parts.at(-1) ?? "") : "";
}

export function normalizeMatterFilename(filename: string): string {
  return filename.trim().toLowerCase();
}

export function sanitizeFilename(filename: string): string {
  const base = filename.trim().replace(/[/\\]/g, "-").replace(/\s+/g, "-");
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "");
  return cleaned.slice(0, 120) || "datei";
}

export function nextUniqueMatterFilename(
  filename: string,
  occupiedNames: Iterable<string>
): string {
  const occupied = new Set(
    Array.from(occupiedNames, (name) => normalizeMatterFilename(name))
  );
  const trimmed = filename.trim() || "datei";
  if (!occupied.has(normalizeMatterFilename(trimmed))) {
    return trimmed;
  }

  const ext = matterFileExtension(trimmed);
  const nameWithoutExt =
    ext && trimmed.toLowerCase().endsWith(`.${ext}`)
      ? trimmed.slice(0, -(ext.length + 1))
      : trimmed;
  const copyMatch = nameWithoutExt.match(/^(.*?)(?: Kopie(?: (\d+))?)$/i);
  const stem = (copyMatch?.[1] ?? nameWithoutExt).trim() || nameWithoutExt;
  const withExt = (base: string) => (ext ? `${base}.${ext}` : base);
  const firstCopy = withExt(`${stem} Kopie`);
  if (!occupied.has(normalizeMatterFilename(firstCopy))) {
    return firstCopy;
  }

  let index = 2;
  while (index < 10_000) {
    const candidate = withExt(`${stem} Kopie ${index}`);
    if (!occupied.has(normalizeMatterFilename(candidate))) {
      return candidate;
    }
    index += 1;
  }

  return withExt(`${stem} Kopie ${Date.now()}`);
}

export function validateMatterFileMeta(
  filename: string,
  sizeBytes: number
): string | null {
  if (!filename.trim()) {
    return "Dateiname fehlt.";
  }
  if (sizeBytes <= 0) {
    return "Leere Dateien sind nicht erlaubt.";
  }
  if (sizeBytes > MAX_MATTER_FILE_BYTES) {
    return "Dateien dürfen maximal 50 MB groß sein.";
  }
  const ext = matterFileExtension(filename);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return "Dateityp nicht erlaubt (PDF, Word, Text oder Bild).";
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function extractableDocumentFormat(
  filename: string,
  mimeType?: string
): "pdf" | "docx" | null {
  const ext = matterFileExtension(filename);
  const mime = (mimeType ?? "").toLowerCase();
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (
    ext === "docx" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  return null;
}
