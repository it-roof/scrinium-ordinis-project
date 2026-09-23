import "server-only";

import mammoth from "mammoth";
import { extractText as extractPdfText } from "unpdf";

import {
  AI_CONTRACT_UPLOAD_MIN_CHARS,
  detectContractUploadKind,
  normalizeExtractedContractText,
  validateContractUploadMeta,
  type ContractUploadKind,
} from "@/lib/ai/contract-extract";
import { AI_CONTRACT_MAX_CHARS } from "@/lib/ai/limits";

export type ExtractContractTextResult =
  | {
      ok: true;
      text: string;
      kind: ContractUploadKind;
      truncated: boolean;
      filename: string;
    }
  | { ok: false; error: string };

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const data = new Uint8Array(buffer);
  const result = await extractPdfText(data, { mergePages: true });
  return typeof result.text === "string" ? result.text : "";
}

/**
 * Extract plain text from an uploaded DOCX/PDF buffer.
 * Does not persist the file. Caller must enforce auth.
 */
export async function extractContractTextFromBuffer(input: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<ExtractContractTextResult> {
  const metaError = validateContractUploadMeta(
    input.filename,
    input.buffer.byteLength,
    input.mimeType
  );
  if (metaError) {
    return { ok: false, error: metaError };
  }

  const kind = detectContractUploadKind(input.filename, input.mimeType);
  if (!kind) {
    return { ok: false, error: "Nur Word (.docx) oder PDF (.pdf) möglich." };
  }

  let raw: string;
  try {
    raw = kind === "docx" ? await extractDocx(input.buffer) : await extractPdf(input.buffer);
  } catch {
    console.error("[ai/contract-extract]", kind.toUpperCase() + "_FAILED");
    return {
      ok: false,
      error:
        kind === "pdf"
          ? "PDF konnte nicht gelesen werden. Bitte eine textbasierte PDF oder DOCX verwenden (keine Scans)."
          : "Word-Datei konnte nicht gelesen werden. Bitte .docx speichern und erneut versuchen.",
    };
  }

  const normalized = normalizeExtractedContractText(raw);
  if (normalized.length < AI_CONTRACT_UPLOAD_MIN_CHARS) {
    return {
      ok: false,
      error:
        kind === "pdf"
          ? "Kaum Text erkannt — vermutlich ein Scan. Bitte textbasierte PDF oder DOCX hochladen."
          : "Kaum Text erkannt. Bitte eine andere DOCX-Datei versuchen.",
    };
  }

  const truncated = normalized.length > AI_CONTRACT_MAX_CHARS;
  const text = truncated
    ? normalized.slice(0, AI_CONTRACT_MAX_CHARS)
    : normalized;

  return {
    ok: true,
    text,
    kind,
    truncated,
    filename: input.filename.trim(),
  };
}
