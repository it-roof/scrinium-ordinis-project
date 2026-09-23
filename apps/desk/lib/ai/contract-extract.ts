/**
 * Pure helpers for contract document upload — unit-testable.
 */

/** Text-extract path (local mammoth/unpdf). */
export const AI_CONTRACT_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;
export const AI_CONTRACT_UPLOAD_MIN_CHARS = 40;

/**
 * Raw document → Bedrock Converse document block.
 * AWS Converse document limit is typically 4.5 MB.
 */
export const AI_CONTRACT_RAW_MAX_BYTES = Math.floor(4.5 * 1024 * 1024);

const DOCX_EXT = /\.docx$/i;
const PDF_EXT = /\.pdf$/i;

const DOCX_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
]);

const PDF_MIME = new Set([
  "application/pdf",
  "application/octet-stream",
]);

export type ContractUploadKind = "docx" | "pdf";

export function detectContractUploadKind(
  filename: string,
  mimeType: string
): ContractUploadKind | null {
  const name = filename.trim();
  const mime = mimeType.trim().toLowerCase();
  if (DOCX_EXT.test(name) && (DOCX_MIME.has(mime) || !mime)) {
    return "docx";
  }
  if (PDF_EXT.test(name) && (PDF_MIME.has(mime) || !mime || mime === "application/x-pdf")) {
    return "pdf";
  }
  // Extension wins when mime is empty/wrong (browser quirks)
  if (DOCX_EXT.test(name)) return "docx";
  if (PDF_EXT.test(name)) return "pdf";
  return null;
}

export function validateContractUploadMeta(
  filename: string,
  sizeBytes: number,
  mimeType: string
): string | null {
  if (!filename.trim()) {
    return "Datei ungültig.";
  }
  if (sizeBytes <= 0) {
    return "Datei ist leer.";
  }
  if (sizeBytes > AI_CONTRACT_UPLOAD_MAX_BYTES) {
    return `Datei zu groß (max. ${Math.round(AI_CONTRACT_UPLOAD_MAX_BYTES / (1024 * 1024))} MB).`;
  }
  if (!detectContractUploadKind(filename, mimeType)) {
    return "Nur Word (.docx) oder PDF (.pdf) möglich.";
  }
  return null;
}

/** Normalize extracted text: collapse extreme whitespace, keep paragraphs. */
export function normalizeExtractedContractText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/^[ \t]+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
