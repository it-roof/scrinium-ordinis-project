const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const PDF_MIME_TYPE = "application/pdf";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_BYTES = 25 * 1024 * 1024;

export type UploadKind = "image" | "pdf";

export function getUploadKind(mimeType: string): UploadKind | null {
  if (IMAGE_MIME_TYPES.has(mimeType)) return "image";
  if (mimeType === PDF_MIME_TYPE) return "pdf";
  return null;
}

export function validateUploadFile(file: File): string | null {
  const kind = getUploadKind(file.type);

  if (!kind) {
    return "Nur Bilder (JPEG, PNG, WebP, GIF) und PDFs sind erlaubt.";
  }

  if (kind === "image" && file.size > MAX_IMAGE_BYTES) {
    return "Bilder dürfen maximal 10 MB groß sein.";
  }

  if (kind === "pdf" && file.size > MAX_PDF_BYTES) {
    return "PDFs dürfen maximal 25 MB groß sein.";
  }

  return null;
}

export function sanitizeFilename(filename: string): string {
  const base = filename.trim().replace(/[/\\]/g, "-").replace(/\s+/g, "-");
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "");

  return cleaned.slice(0, 120) || "datei";
}

export function buildStoredFilename(
  originalName: string,
  assetId: string,
  mimeType?: string
): string {
  const sanitized = sanitizeFilename(originalName);
  const lastDot = sanitized.lastIndexOf(".");
  let extension = lastDot > 0 ? sanitized.slice(lastDot).toLowerCase() : "";

  if (!extension && mimeType) {
    const mimeExtensions: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "application/pdf": ".pdf",
    };
    extension = mimeExtensions[mimeType] ?? "";
  }

  return `${assetId}${extension}`;
}

export function buildMarkdownSnippet(
  assetId: string,
  filename: string,
  kind: UploadKind
): string {
  const url = `/api/docs/files/${assetId}`;

  if (kind === "image") {
    return `![${filename}](${url})`;
  }

  return `[${filename}](${url})`;
}
